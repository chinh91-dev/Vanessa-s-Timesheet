import { supabase } from "@/integrations/supabase/client";
import { attachUserRole, attachUserRoles } from "./user-with-role-utils";

export interface User {
  id: string;
  full_name?: string;
  organization?: string;
  time_zone?: string;
  email?: string;
  employment_type?: 'full-time' | 'part-time';
  employee_card_id?: string;
  employee_id?: string;
  is_active?: boolean;
  deactivated_at?: string;
  deactivation_reason?: string;
}

/**
 * User with role information fetched from user_roles table
 * Use this interface when you need role information along with user data
 */
export interface UserWithRole extends User {
  role: string;
}

/**
 * User data for update operations - includes optional role
 */
export interface UserUpdateData extends User {
  role?: string;
}

export interface NewUser extends Omit<User, "id"> {
  email: string;
  password: string;
  role?: string; // Role to be inserted into user_roles table
}

// Define the Supabase Auth User interface to ensure correct typing
interface SupabaseAuthUser {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
}

interface AuthUsersResponse {
  users: SupabaseAuthUser[];
}

// New function to fetch only users with valid work schedules
export const fetchUsersWithWorkSchedules = async (): Promise<User[]> => {
  console.log('Fetching users with work schedules...');
  
  // Get profiles with their office day requirements - only active users
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(`
      *,
      default_monday_office,
      default_tuesday_office,
      default_wednesday_office,
      default_thursday_office,
      default_friday_office
    `)
    .eq('is_active', true)  // CRITICAL: Only include active users
    .order('full_name', { ascending: true });
  
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    throw profilesError;
  }

  console.log('Profiles fetched:', profiles?.length || 0);

  if (!profiles || profiles.length === 0) {
    console.log('No profiles found');
    return [];
  }

  // Get work schedules for all users
  const userIds = profiles.map(p => p.id);
  const { data: workSchedules, error: schedulesError } = await supabase
    .from('work_schedules')
    .select(`
      user_id,
      working_days,
      default_monday_location,
      default_tuesday_location,
      default_wednesday_location,
      default_thursday_location,
      default_friday_location,
      default_saturday_location,
      default_sunday_location
    `)
    .in('user_id', userIds);

  if (schedulesError) {
    console.error('Error fetching work schedules:', schedulesError);
    throw schedulesError;
  }

  console.log('Work schedules fetched:', workSchedules?.length || 0);

  // Create a map of user_id to work schedule for easy lookup
  const scheduleMap = new Map();
  (workSchedules || []).forEach(schedule => {
    scheduleMap.set(schedule.user_id, schedule);
  });

  // Filter profiles to only include those with valid work schedules
  const filteredUsers = profiles.filter(user => {
    const workSchedule = scheduleMap.get(user.id);
    
    if (!workSchedule) {
      console.log(`User ${user.full_name || user.email} has no work schedule`);
      return false;
    }

    if (!workSchedule.working_days || workSchedule.working_days <= 0) {
      console.log(`User ${user.full_name || user.email} has no working days`);
      return false;
    }

    // Check if user has valid location/office day combinations
    // Only count days where both location is set AND office is required
    const validDays = [
      { day: 'Monday', location: workSchedule.default_monday_location, office: user.default_monday_office },
      { day: 'Tuesday', location: workSchedule.default_tuesday_location, office: user.default_tuesday_office },
      { day: 'Wednesday', location: workSchedule.default_wednesday_location, office: user.default_wednesday_office },
      { day: 'Thursday', location: workSchedule.default_thursday_location, office: user.default_thursday_office },
      { day: 'Friday', location: workSchedule.default_friday_location, office: user.default_friday_office },
    ].filter(d => d.location && d.office === true);

    if (validDays.length === 0) {
      console.log(`User ${user.full_name || user.email} has no valid location/office day combinations`);
      return false;
    }

    console.log(`User ${user.full_name || user.email} has ${validDays.length} valid work days:`, validDays.map(d => d.day).join(', '));
    return true;
  });

  console.log('Filtered users count:', filteredUsers.length);
  return filteredUsers;
};

export const fetchUsers = async (includeInactive: boolean = false): Promise<UserWithRole[]> => {
  try {
    console.log("🔍 fetchUsers called with includeInactive:", includeInactive);
    
    // First, get the authenticated user
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error("Error fetching current user:", authError);
      throw authError;
    }
    
    console.log("Current authenticated user:", authData?.user?.email);
    
    // Get all profiles from the profiles table including new employee_id and is_active fields
    let query = supabase
      .from("profiles")
      .select("id, full_name, organization, time_zone, email, employment_type, employee_card_id, employee_id, is_active, deactivated_at, deactivation_reason");
    
    console.log("📋 Base query created. includeInactive:", includeInactive);
    
    // Filter based on includeInactive parameter
    if (includeInactive) {
      console.log("🔒 Showing ONLY inactive users");
      query = query.eq('is_active', false);
    } else {
      console.log("🔓 Showing ONLY active users");
      query = query.eq('is_active', true);
    }

    const { data: profilesData, error: profilesError } = await query;
    
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }
    
    console.log(`Fetched ${profilesData?.length || 0} profiles`);
    
    // If no profiles are found, create one for the current user
    if ((!profilesData || profilesData.length === 0) && authData.user) {
      console.log("No profiles found, creating one for current user");
      
      // Create a profile for the current user
      const newProfile = {
        id: authData.user.id,
        full_name: authData.user.user_metadata?.full_name || "Admin User",
        organization: "Comans Services",
        time_zone: "Australia/Sydney",
        email: authData.user.email,
        employment_type: "full-time" as const,
        employee_card_id: null,
        employee_id: null,
      };

      // Insert the new profile
      const { data: createdProfile, error: createError } = await supabase
        .from("profiles")
        .insert([newProfile])
        .select();

      if (createError) {
        console.error("Error creating profile:", createError);
      } else if (createdProfile && createdProfile.length > 0) {
        console.log("Created profile for current user:", createdProfile);

        // Insert admin role into user_roles table
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: "admin",
            created_by: authData.user.id
          });

        if (roleError) {
          console.error("Error creating admin role:", roleError);
        }

        // Attach roles and return
        return await attachUserRoles(createdProfile);
      }
    }
    
    // If profiles exist but some are missing emails, fetch the emails from auth
    if (profilesData && profilesData.length > 0) {
      // Find profiles with missing emails
      const profilesWithoutEmails = profilesData.filter(profile => !profile.email);
      
      if (profilesWithoutEmails.length > 0) {
        console.log(`Found ${profilesWithoutEmails.length} profiles without emails, attempting to fetch and update`);
        
        try {
          // Fetch all auth users (requires admin privileges)
          const { data: authUsersData } = await supabase.auth.admin.listUsers();
          
          // Fix the type issue here - properly type the authUsersData to avoid the "never" type error
          if (authUsersData && 'users' in authUsersData && Array.isArray(authUsersData.users)) {
            console.log(`Fetched ${authUsersData.users.length} auth users`);
            
            // Update each profile with missing email
            for (const profile of profilesWithoutEmails) {
              // Ensure users array is properly typed
              const users = authUsersData.users as SupabaseAuthUser[];
              const matchingAuthUser = users.find(user => user.id === profile.id);
              
              if (matchingAuthUser && matchingAuthUser.email) {
                console.log(`Updating profile ${profile.id} with email ${matchingAuthUser.email}`);
                
                // Update profile in database
                const { error: updateError } = await supabase
                  .from("profiles")
                  .update({ email: matchingAuthUser.email })
                  .eq("id", profile.id);
                
                if (updateError) {
                  console.error(`Error updating email for profile ${profile.id}:`, updateError);
                } else {
                  // Update email in our local data
                  profile.email = matchingAuthUser.email;
                }
              }
            }
          }
        } catch (authError) {
          console.error("Error fetching auth users:", authError);
          
          // Alternative approach for non-admin users: try to match the current user
          if (authData.user) {
            const currentUserProfile = profilesWithoutEmails.find(p => p.id === authData.user?.id);
            if (currentUserProfile && authData.user.email) {
              console.log(`Updating current user profile with email ${authData.user.email}`);
              
              // Update the current user's profile with their email
              await supabase
                .from("profiles")
                .update({ email: authData.user.email })
                .eq("id", authData.user.id);
              
              currentUserProfile.email = authData.user.email;
            }
          }
        }
      }
      
      console.log("Final profiles data with employment and employee_id fields:", profilesData);
      
      // Debug: Log active vs inactive user count
      const activeCount = profilesData.filter(user => user.is_active).length;
      const inactiveCount = profilesData.filter(user => !user.is_active).length;
      console.log(`📊 User breakdown: ${activeCount} active, ${inactiveCount} inactive`);
      
      // Debug: Log inactive users specifically
      const inactiveUsers = profilesData.filter(user => !user.is_active);
      if (inactiveUsers.length > 0) {
        console.log("❌ Inactive users found:", inactiveUsers.map(u => ({
          name: u.full_name,
          email: u.email,
          is_active: u.is_active,
          deactivated_at: u.deactivated_at,
          deactivation_reason: u.deactivation_reason
        })));
      }

      // Attach roles from user_roles table before returning
      return await attachUserRoles(profilesData);
    }

    return [];
  } catch (error) {
    console.error("Error in fetchUsers:", error);
    throw error;
  }
};

export const fetchUserById = async (userId: string): Promise<UserWithRole | null> => {
  try {
    console.log(`Fetching user with ID: ${userId}`);
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, organization, time_zone, employment_type, employee_card_id, employee_id")
      .eq("id", userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching user:", error);
      return null;
    }
    
    if (!data) {
      console.log("No profile found, creating default profile");
      
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        console.error("No authenticated user found");
        return null;
      }
      
      const newProfile = {
        id: userId,
        full_name: authData.user.user_metadata?.full_name || "",
        organization: "",
        time_zone: "UTC",
        email: authData.user.email,
        employment_type: "full-time" as const,
        employee_card_id: null,
        employee_id: null,
      };

      const { data: createdProfile, error: createError } = await supabase
        .from("profiles")
        .insert([newProfile])
        .select()
        .single();

      if (createError) {
        console.error("Error creating profile:", createError);
        return null;
      }

      // Insert employee role into user_roles table
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "employee",
          created_by: authData.user.id
        });

      if (roleError) {
        console.error("Error creating employee role:", roleError);
      }

      // Attach role and return
      return await attachUserRole(createdProfile);
    }
    
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user && authData.user.id === userId) {
      const userWithEmail = {
        ...data,
        email: authData.user.email
      };
      return await attachUserRole(userWithEmail);
    }

    // Attach role and return
    return await attachUserRole(data);
  } catch (error) {
    console.error("Error in fetchUserById:", error);
    return null;
  }
};

export const updateUser = async (user: UserUpdateData): Promise<User> => {
  try {
    console.log("Updating user:", user);

    // Build update data with only fields that exist in profiles table
    // Note: 'role' is NOT in profiles table - it's in user_roles table
    // Note: 'full_name' is intentionally excluded - it cannot be changed after creation
    const updateData: any = {
      organization: user.organization,
      time_zone: user.time_zone,
      email: user.email,
      employment_type: user.employment_type,
      employee_card_id: user.employee_card_id || null,
      employee_id: user.employee_id || null,
      updated_at: new Date().toISOString(),
    };

    // Only include deactivated_at if it's provided
    if (user.deactivated_at !== undefined) {
      updateData.deactivated_at = user.deactivated_at || null;
    }
    
    console.log("Attempting to update profiles table with:", updateData);
    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select();

    if (error) {
      console.error("Error updating user profile:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    console.log("Profiles table updated successfully:", data);
    
    // Update role in user_roles table (if role is provided)
    if (user.role) {
      console.log(`Updating role to '${user.role}' for user ${user.id}`);

      // Delete existing roles for this user
      console.log("Deleting existing roles for user:", user.id);
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Error deleting old roles:", deleteError);
        console.error("Delete error details:", JSON.stringify(deleteError, null, 2));
        // Don't throw - try to insert anyway
      } else {
        console.log("Old roles deleted successfully");
      }

      // Insert new role
      const { data: authData } = await supabase.auth.getUser();
      console.log("Inserting new role:", {
        user_id: user.id,
        role: user.role,
        created_by: authData?.user?.id
      });
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: user.role,
          created_by: authData?.user?.id
        });

      if (roleError) {
        console.error("Error updating user role:", roleError);
        console.error("Role error details:", JSON.stringify(roleError, null, 2));
        throw new Error(`Failed to update role: ${roleError.message}`);
      }

      console.log("Role updated successfully");
    }
    
    console.log("User updated successfully:", data?.[0]);
    return {
      ...data?.[0],
      role: user.role
    } as UserWithRole;
  } catch (error) {
    console.error("Error in updateUser:", error);
    throw error;
  }
};

export const createUser = async (userData: NewUser): Promise<User> => {
  try {
    console.log("Creating new user (matching CSV import method)...");
    
    // Use the same approach as CSV import - signUp instead of admin API
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.full_name,
        },
        emailRedirectTo: undefined // This will prevent email confirmation requirement
      }
    });
    
    if (authError || !authData.user) {
      console.error("Error creating auth user:", authError);
      throw authError || new Error("Failed to create user");
    }
    
    console.log("Auth user created successfully:", authData.user.id);
    
    try {
      // Step 2: Create profile record (exactly like CSV import)
      const profileData = {
        id: authData.user.id,
        full_name: userData.full_name,
        email: userData.email,
        organization: userData.organization,
        time_zone: userData.time_zone,
        employment_type: userData.employment_type || "full-time",
        employee_card_id: userData.employee_card_id,
        employee_id: userData.employee_id,
        must_change_password: true, // Force password change on first login
        updated_at: new Date().toISOString(),
      };
      
      console.log("Creating profile record:", profileData);
      
      const { data: profileResult, error: profileError } = await supabase
        .from("profiles")
        .insert(profileData)
        .select()
        .single();
      
      if (profileError) {
        console.error("Error creating profile:", profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
      
      // Insert role into user_roles table
      const userRole = userData.role || "employee";
      console.log(`Inserting role '${userRole}' into user_roles for user ${authData.user.id}`);
      
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: userRole,
          created_by: authData.user.id // Self-assigned on creation
        });
      
      if (roleError) {
        console.error("Error inserting user role:", roleError);
        throw new Error(`Failed to assign role: ${roleError.message}`);
      }
      
      console.log("User and role created successfully:", profileResult);
      return {
        ...profileResult,
        role: userRole
      } as UserWithRole;
      
    } catch (profileCreationError) {
      console.error("Profile creation failed:", profileCreationError);
      throw profileCreationError;
    }
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    console.log("Deleting user:", userId);
    
    // Use the secure database function to delete user and all associated data
    const { error } = await supabase.rpc('delete_user_cascade', {
      p_user_id: userId
    });
    
    if (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
    
    console.log("User deleted successfully");
  } catch (error) {
    console.error("Error in deleteUser:", error);
    throw error;
  }
};

export const deactivateUser = async (userId: string, reason?: string): Promise<void> => {
  try {
    console.log("Deactivating user:", userId);
    
    const { error } = await supabase.rpc('deactivate_user', {
      p_user_id: userId,
      p_reason: reason
    });
    
    if (error) {
      console.error("Error deactivating user:", error);
      throw error;
    }
    
    console.log("User deactivated successfully");
  } catch (error) {
    console.error("Error in deactivateUser:", error);
    throw error;
  }
};

export const reactivateUser = async (userId: string): Promise<void> => {
  try {
    console.log("Reactivating user:", userId);
    
    const { error } = await supabase.rpc('reactivate_user', {
      p_user_id: userId
    });
    
    if (error) {
      console.error("Error reactivating user:", error);
      throw error;
    }
    
    console.log("User reactivated successfully");
  } catch (error) {
    console.error("Error in reactivateUser:", error);
    throw error;
  }
};

// Helper function to validate if a user has a proper work schedule
export const hasValidWorkSchedule = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('work_schedules')
    .select(`
      working_days,
      default_monday_location,
      default_tuesday_location,
      default_wednesday_location,
      default_thursday_location,
      default_friday_location,
      default_saturday_location,
      default_sunday_location
    `)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !data) {
    return false;
  }

  // Must have working days > 0
  if (!data.working_days || data.working_days <= 0) {
    return false;
  }

  // Must have at least one default location configured
  const hasAnyLocation = data.default_monday_location || 
                        data.default_tuesday_location || 
                        data.default_wednesday_location || 
                        data.default_thursday_location || 
                        data.default_friday_location || 
                        data.default_saturday_location || 
                        data.default_sunday_location;

  return hasAnyLocation;
};
