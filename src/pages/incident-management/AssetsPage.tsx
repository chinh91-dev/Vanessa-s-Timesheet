import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AssetsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to asset groups page
    navigate('groups', { replace: true });
  }, [navigate]);

  return null;
}
