import { useCallback, useEffect, useRef } from 'react';

import { ENV } from '@/constants/env';
import { useAuthStore } from '@/lib/stores/user-auth-store';
import type { AssessmentStatus } from '@repo/shared/constants/learning';
import type { AssessmentStreamEventDTO } from '@repo/shared/types/learning';

import { EventSourcePolyfill } from 'event-source-polyfill';

type UseAssessmentStreamProps = {
  sessionId: number | null;
  answerId: number | null;
  onStatusChange?: (status: AssessmentStatus) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
};

type UseAssessmentStreamReturn = {
  disconnect: () => void;
};

export const useAssessmentStream = ({
  sessionId,
  answerId,
  onStatusChange,
  onError,
  onDone,
}: UseAssessmentStreamProps): UseAssessmentStreamReturn => {
  const eventSourceRef = useRef<EventSource | EventSourcePolyfill | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!sessionId || !answerId || !accessToken) return;
    const url = `${ENV.API_URL}/learning/${sessionId}/answers/${answerId}/assess/stream`;
    const eventSource = new EventSourcePolyfill(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      heartbeatTimeout: 60 * 1000,
    });
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
  }, [answerId, onStatusChange, onError, onDone, disconnect, accessToken, sessionId]);

  return {
    disconnect,
  };
};
