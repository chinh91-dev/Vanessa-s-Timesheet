
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
				'3xl': '1920px',
				'4xl': '2560px'
			}
		},
		extend: {
			screens: {
				'3xl': '1920px',
				'4xl': '2560px',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			boxShadow: {
				'sm': 'var(--shadow-sm)',
				'DEFAULT': 'var(--shadow)',
				'md': 'var(--shadow-md)',
				'lg': 'var(--shadow-lg)',
				'xl': 'var(--shadow-xl)',
				'2xl': 'var(--shadow-2xl)',
				'card-hover': 'var(--card-hover-shadow)',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			spacing: {
				'fluid-xs': 'clamp(0.25rem, 0.5vw, 0.5rem)',
				'fluid-sm': 'clamp(0.5rem, 1vw, 1rem)',
				'fluid-md': 'clamp(1rem, 2vw, 2rem)',
				'fluid-lg': 'clamp(1.5rem, 3vw, 3rem)',
				'fluid-xl': 'clamp(2rem, 4vw, 4rem)',
				'touch': '44px', // iOS minimum touch target size
			},
			minHeight: {
				'touch': '44px', // iOS minimum touch target size
			},
			minWidth: {
				'touch': '44px', // iOS minimum touch target size
			},
			fontSize: {
				'fluid-xs': 'clamp(0.75rem, 1.5vw, 0.875rem)',
				'fluid-sm': 'clamp(0.875rem, 2vw, 1rem)',
				'fluid-base': 'clamp(1rem, 2.5vw, 1.125rem)',
				'fluid-lg': 'clamp(1.125rem, 3vw, 1.25rem)',
				'fluid-xl': 'clamp(1.25rem, 3.5vw, 1.5rem)',
				'fluid-2xl': 'clamp(1.5rem, 4vw, 2rem)',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		function({ addUtilities }: { addUtilities: Function }) {
			const newUtilities = {
				'.grid-auto-fit-200': {
					'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
				},
				'.grid-auto-fit-250': {
					'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
				},
				'.grid-auto-fit-280': {
					'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))',
				},
				'.grid-auto-fit-300': {
					'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
				},
				'.grid-auto-fit-350': {
					'grid-template-columns': 'repeat(auto-fit, minmax(350px, 1fr))',
				},
				'.grid-auto-fill-200': {
					'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
				},
				'.grid-auto-fill-250': {
					'grid-template-columns': 'repeat(auto-fill, minmax(250px, 1fr))',
				},
				'.grid-auto-fill-280': {
					'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
				},
				'.container-responsive': {
					width: '100%',
					'max-width': '100%',
					'margin-left': 'auto',
					'margin-right': 'auto',
					'padding-left': 'clamp(1rem, 5vw, 2rem)',
					'padding-right': 'clamp(1rem, 5vw, 2rem)',
				},
			};
			addUtilities(newUtilities);
		},
	],
} satisfies Config;
