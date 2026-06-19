import React, { useState, ReactNode } from 'react';
import { useSpring, animated, config } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { Pencil, Trash2, Archive, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptic';

type SwipeAction = 'edit' | 'delete' | 'archive' | 'star' | 'complete';

interface SwipeActionConfig {
  type: SwipeAction;
  label: string;
  icon: ReactNode;
  color: string;
  textColor?: string;
  onAction: () => void;
}

interface SwipeableCardProps {
  children: ReactNode;
  leftAction?: SwipeActionConfig;
  rightAction?: SwipeActionConfig;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  threshold?: number;
}

const defaultIcons: Record<SwipeAction, ReactNode> = {
  edit: <Pencil className="h-5 w-5" />,
  delete: <Trash2 className="h-5 w-5" />,
  archive: <Archive className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  complete: <Check className="h-5 w-5" />,
};

const defaultColors: Record<SwipeAction, string> = {
  edit: 'bg-blue-500',
  delete: 'bg-destructive',
  archive: 'bg-amber-500',
  star: 'bg-yellow-500',
  complete: 'bg-green-500',
};

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  leftAction,
  rightAction,
  onClick,
  disabled = false,
  className,
  threshold = 80,
}) => {
  const [activeAction, setActiveAction] = useState<'left' | 'right' | 'none'>('none');
  const [confirming, setConfirming] = useState(false);

  const ACTION_WIDTH = 80;

  // Spring animation
  const [{ x }, api] = useSpring(() => ({
    x: 0,
    config: config.stiff,
  }));

  // Drag handler
  const bind = useDrag(
    ({ movement: [mx], velocity: [vx], active, canceled }) => {
      if (disabled || confirming) return;

      if (!active) {
        if (canceled) {
          api.start({ x: 0 });
          setActiveAction('none');
          return;
        }

        const shouldTrigger = Math.abs(mx) > threshold || vx > 0.5;

        if (shouldTrigger) {
          if (mx < -threshold && rightAction) {
            triggerHaptic('selection');
            setActiveAction('right');
            api.start({ x: -ACTION_WIDTH });
          } else if (mx > threshold && leftAction) {
            triggerHaptic('selection');
            setActiveAction('left');
            api.start({ x: ACTION_WIDTH });
          } else {
            api.start({ x: 0 });
            setActiveAction('none');
          }
        } else {
          api.start({ x: 0 });
          setActiveAction('none');
        }
      } else {
        // While dragging
        const maxSwipe = ACTION_WIDTH * 1.2;
        const minSwipe = leftAction ? -maxSwipe : 0;
        const maxSwipeRight = rightAction ? maxSwipe : 0;

        const resistance = 0.6;
        const boundedX = Math.max(
          rightAction ? -maxSwipe : 0,
          Math.min(leftAction ? maxSwipe : 0, mx * resistance)
        );

        api.start({ x: boundedX, immediate: true });

        // Update active action based on position
        if (mx < -threshold && rightAction && activeAction !== 'right') {
          setActiveAction('right');
          triggerHaptic('selection');
        } else if (mx > threshold && leftAction && activeAction !== 'left') {
          setActiveAction('left');
          triggerHaptic('selection');
        } else if (Math.abs(mx) <= threshold && activeAction !== 'none') {
          setActiveAction('none');
        }
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      threshold: 10,
      enabled: !disabled && (!!leftAction || !!rightAction),
    }
  );

  const handleConfirm = () => {
    setConfirming(true);

    const action = activeAction === 'left' ? leftAction : rightAction;
    if (action) {
      triggerHaptic(action.type === 'delete' ? 'heavy' : 'medium');
      action.onAction();
    }

    setTimeout(() => {
      api.start({ x: 0 });
      setActiveAction('none');
      setConfirming(false);
    }, 300);
  };

  const handleCancel = () => {
    triggerHaptic('light');
    api.start({ x: 0 });
    setActiveAction('none');
  };

  const handleClick = () => {
    if (activeAction === 'none' && onClick) {
      triggerHaptic('light');
      onClick();
    }
  };

  const getActionConfig = (action: SwipeActionConfig) => ({
    icon: action.icon || defaultIcons[action.type],
    color: action.color || defaultColors[action.type],
    textColor: action.textColor || 'text-white',
  });

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Background Actions */}
      <div className="absolute inset-0 flex justify-between items-stretch">
        {/* Left action background */}
        {leftAction && (
          <div
            className={cn(
              "flex items-center justify-center w-20",
              getActionConfig(leftAction).color,
              getActionConfig(leftAction).textColor,
              "transition-opacity duration-200",
              activeAction === 'left' ? 'opacity-100' : 'opacity-0'
            )}
          >
            {getActionConfig(leftAction).icon}
          </div>
        )}

        <div className="flex-1" />

        {/* Right action background */}
        {rightAction && (
          <div
            className={cn(
              "flex items-center justify-center w-20",
              getActionConfig(rightAction).color,
              getActionConfig(rightAction).textColor,
              "transition-opacity duration-200",
              activeAction === 'right' ? 'opacity-100' : 'opacity-0'
            )}
          >
            {getActionConfig(rightAction).icon}
          </div>
        )}
      </div>

      {/* Swipeable Content */}
      <animated.div
        {...bind()}
        style={{
          x,
          touchAction: 'pan-y',
        }}
        className={cn(
          "bg-background",
          !disabled && (leftAction || rightAction) && "cursor-grab active:cursor-grabbing"
        )}
        onClick={handleClick}
      >
        {children}

        {/* Confirm Action Overlay */}
        {activeAction !== 'none' && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-background border-t animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="flex-1 h-10"
              >
                Cancel
              </Button>
              <Button
                variant={activeAction === 'right' && rightAction?.type === 'delete' ? 'destructive' : 'default'}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirm();
                }}
                className="flex-1 h-10"
              >
                {activeAction === 'left' ? leftAction?.label : rightAction?.label}
              </Button>
            </div>
          </div>
        )}
      </animated.div>
    </div>
  );
};

export default SwipeableCard;
