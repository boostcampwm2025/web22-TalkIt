// rule-based, 음차만 수정
export function preNormalize(text: string): string {
  if (!text) return text;

  const MAP: Record<string, string> = {
    // OS / HW
    오에스: 'OS',
    커널: 'kernel',
    스케줄러: 'scheduler',
    컨텍스트: 'context',
    컨텍스트스위칭: 'context switching',

    // CPU / GPU / Memory
    씨피유: 'CPU',
    지피유: 'GPU',
    캐시: 'cache',
    레지스터: 'register',
    메모리: 'memory',
    페이징: 'paging',
    페이지폴트: 'page fault',

    // Process / Thread
    프로세스: 'process',
    쓰레드: 'thread',
    스레드: 'thread',
    멀티쓰레드: 'multithread',
    멀티스레드: 'multithread',

    // Sync / Concurrency
    락: 'lock',
    스핀락: 'spinlock',
    뮤텍스: 'mutex',
    세마포어: 'semaphore',
    데드락: 'deadlock',

    // Network
    아이피: 'IP',
    포트: 'port',
    소켓: 'socket',
    패킷: 'packet',
    라우터: 'router',

    // DB / Storage
    데이터베이스: 'database',
    디비: 'DB',
    노에스큐엘: 'NoSQL',
    에스큐엘: 'SQL',
    트랜잭션: 'transaction',
    인덱스: 'index',
    해시: 'hash',
    해시인덱스: 'hash index',

    // Backend / API
    에이피아이: 'API',
    엔드포인트: 'endpoint',
    리퀘스트: 'request',
    리스폰스: 'response',

    // Programming
    펑션: 'function',
    베리어블: 'variable',
    배리어블: 'variable',
    클래스: 'class',
    인터페이스: 'interface',
    오브젝트: 'object',
  };

  let result = text;
  for (const [from, to] of Object.entries(MAP)) {
    result = result.replaceAll(from, to);
  }

  return result;
}
