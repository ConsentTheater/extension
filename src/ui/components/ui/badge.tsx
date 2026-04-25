import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        gold: 'border-transparent bg-accent text-accent-foreground',
        // Consent burden — what the tracker requires under GDPR/ePrivacy
        required_strict: 'border-transparent bg-red-50 text-red-800 uppercase dark:bg-red-950 dark:text-red-200',
        required: 'border-transparent bg-orange-50 text-orange-800 uppercase dark:bg-orange-950 dark:text-orange-200',
        contested: 'border-transparent bg-amber-50 text-amber-800 uppercase dark:bg-amber-950 dark:text-amber-200',
        minimal: 'border-transparent bg-slate-100 text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-300'
      }
    },
    defaultVariants: { variant: 'default' }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
