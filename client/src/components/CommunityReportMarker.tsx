import { Camera, CameraOff, Car, Construction, AlertTriangle, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { CommunityReport } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

interface CommunityReportMarkerProps {
  report: CommunityReport;
}

const REPORT_ICONS = {
  fixed_camera: Camera,
  mobile_camera: CameraOff,
  accident: Car,
  roadwork: Construction,
  hazard: AlertTriangle,
};

const REPORT_LABELS = {
  fixed_camera: 'Fixed Camera',
  mobile_camera: 'Mobile Camera',
  accident: 'Accident',
  roadwork: 'Roadwork',
  hazard: 'Hazard',
};

export default function CommunityReportMarker({ report }: CommunityReportMarkerProps) {
  const { toast } = useToast();
  const Icon = REPORT_ICONS[report.type];

  const getVoterId = () => {
    let voterId = localStorage.getItem('reporterId');
    if (!voterId) {
      voterId = `user-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('reporterId', voterId);
    }
    return voterId;
  };

  const hasVoted = report.voters.includes(getVoterId());

  const handleVote = async (voteType: 'confirm' | 'reject') => {
    if (hasVoted) {
      toast({
        title: 'Already voted',
        description: 'You have already voted on this report',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiRequest('POST', `/api/reports/${report.id}/vote`, {
        voterId: getVoterId(),
        voteType,
      });

      await queryClient.invalidateQueries({ queryKey: ['/api/reports'] });

      toast({
        title: 'Vote recorded',
        description: 'Thank you for your feedback!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record vote. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getTrustBadgeVariant = (trustScore: number) => {
    if (trustScore >= 70) return 'default';
    if (trustScore >= 40) return 'secondary';
    return 'destructive';
  };

  const timeAgo = formatDistanceToNow(report.reportedAt, { addSuffix: true });

  return (
    <Card className="w-80" data-testid={`report-${report.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">{REPORT_LABELS[report.type]}</CardTitle>
              <CardDescription className="text-xs flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </CardDescription>
            </div>
          </div>
          <Badge variant={getTrustBadgeVariant(report.trustScore)} data-testid={`badge-trust-${report.id}`}>
            {report.trustScore}% trusted
          </Badge>
        </div>
      </CardHeader>

      {report.description && (
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground">{report.description}</p>
        </CardContent>
      )}

      <CardFooter className="flex items-center justify-between gap-2 pt-3 border-t">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            <span data-testid={`confirmations-${report.id}`}>{report.confirmations}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThumbsDown className="h-3 w-3" />
            <span data-testid={`rejections-${report.id}`}>{report.rejections}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleVote('confirm')}
            disabled={hasVoted}
            data-testid={`button-confirm-${report.id}`}
          >
            <ThumbsUp className="h-3 w-3" />
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleVote('reject')}
            disabled={hasVoted}
            data-testid={`button-reject-${report.id}`}
          >
            <ThumbsDown className="h-3 w-3" />
            Not there
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
