import { useState } from 'react';
import { Flag, Camera, CameraOff, Car, Construction, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { InsertCommunityReport } from '@shared/schema';

interface ReportButtonProps {
  currentLocation: [number, number];
}

const REPORT_TYPES = [
  {
    type: 'fixed_camera' as const,
    label: 'Fixed Camera',
    icon: Camera,
    description: 'Speed or traffic camera at a fixed location',
  },
  {
    type: 'mobile_camera' as const,
    label: 'Mobile Camera',
    icon: CameraOff,
    description: 'Mobile speed trap or police checkpoint',
  },
  {
    type: 'accident' as const,
    label: 'Accident',
    icon: Car,
    description: 'Traffic accident or collision',
  },
  {
    type: 'roadwork' as const,
    label: 'Roadwork',
    icon: Construction,
    description: 'Construction or road maintenance',
  },
  {
    type: 'hazard' as const,
    label: 'Hazard',
    icon: AlertTriangle,
    description: 'Road hazard or dangerous condition',
  },
];

export default function ReportButton({ currentLocation }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<InsertCommunityReport['type'] | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const getReporterId = () => {
    let reporterId = localStorage.getItem('reporterId');
    if (!reporterId) {
      reporterId = `user-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('reporterId', reporterId);
    }
    return reporterId;
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      toast({
        title: 'Select report type',
        description: 'Please select what you want to report',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const reportData: InsertCommunityReport = {
        type: selectedType,
        location: currentLocation,
        description: description.trim() || undefined,
        reporterId: getReporterId(),
        reportedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      await apiRequest('/api/reports', {
        method: 'POST',
        body: JSON.stringify(reportData),
      });

      await queryClient.invalidateQueries({ queryKey: ['/api/reports'] });

      toast({
        title: 'Report submitted',
        description: 'Thank you for helping the community!',
      });

      setOpen(false);
      setSelectedType(null);
      setDescription('');
    } catch (error: any) {
      const errorMessage = error?.remainingSeconds
        ? `Please wait ${error.remainingSeconds} seconds before submitting another report`
        : 'Failed to submit report. Please try again.';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="default"
          className="gap-2"
          data-testid="button-open-report"
        >
          <Flag className="h-4 w-4" />
          Report
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]" data-testid="sheet-report">
        <SheetHeader>
          <SheetTitle>Report an Issue</SheetTitle>
          <SheetDescription>
            Help the community by reporting cameras, hazards, and incidents
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <Label className="text-base font-semibold">What do you want to report?</Label>
            <div className="grid grid-cols-1 gap-3 mt-3">
              {REPORT_TYPES.map((reportType) => {
                const Icon = reportType.icon;
                const isSelected = selectedType === reportType.type;

                return (
                  <button
                    key={reportType.type}
                    onClick={() => setSelectedType(reportType.type)}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left hover-elevate active-elevate-2 ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                    data-testid={`button-report-${reportType.type}`}
                  >
                    <div className={`p-2 rounded-md ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{reportType.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {reportType.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the situation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 resize-none"
              rows={3}
              maxLength={200}
              data-testid="input-report-description"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/200 characters
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!selectedType || isSubmitting}
              className="flex-1"
              data-testid="button-submit-report"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
            <Button
              onClick={() => setOpen(false)}
              variant="outline"
              data-testid="button-cancel-report"
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
