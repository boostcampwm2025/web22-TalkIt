import { useCallback, useEffect, useRef } from 'react';

import { ENV } from '@/constants/env';
import type { AssessmentStatus } from '@repo/shared/constants/learning';
import type { AssessmentStreamEventDTO } from '@repo/shared/types/learning';

type UseAssessmentStreamProps = {
  answerId: number | null;
  onStatusChange?: (status: AssessmentStatus) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
};

type UseAssessmentStreamReturn = {
  disconnect: () => void;
};

export const useAssessmentStream = ({
  answerId,
  onStatusChange,
  onError,
  onDone,
}: UseAssessmentStreamProps): UseAssessmentStreamReturn => {
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!answerId) return;

    const url = `${ENV.API_URL}/learning/answers/${answerId}/assess/stream`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: AssessmentStreamEventDTO = JSON.parse(event.data);

        if (data.error) {
          onError?.(data.error);
          disconnect();
          return;
        }

        onStatusChange?.(data.status);

        if (data.status === 'DONE') {
          onDone?.();
          disconnect();
        }

        if (data.status === 'FAILED') {
          onError?.('평가에 실패했습니다.');
          disconnect();
        }
      } catch {
        onError?.('SSE 데이터 파싱 오류');
      }
    };

    eventSource.onerror = () => {
      onError?.('SSE 연결 오류');
      disconnect();
    };

    return () => {
      disconnect();
    };
  }, [answerId, onStatusChange, onError, onDone, disconnect]);

  return {
    disconnect,
  };
};
