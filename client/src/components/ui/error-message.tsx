import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  variant?: 'default' | 'inline' | 'toast';
}

export function ErrorMessage({
  title = "Error",
  message,
  onRetry,
  className,
  variant = 'default',
}: ErrorMessageProps) {
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-destructive",
          className
        )}
        data-testid="error-message-inline"
      >
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{message}</span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="ml-auto"
            data-testid="button-retry"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="font-semibold">{title}</div>
        <div className="text-sm opacity-90">{message}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center",
        className
      )}
      data-testid="error-message"
    >
      <AlertCircle className="h-10 w-10 text-destructive" />
      <div>
        <h3 className="font-semibold text-destructive">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2"
          data-testid="button-retry"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}
