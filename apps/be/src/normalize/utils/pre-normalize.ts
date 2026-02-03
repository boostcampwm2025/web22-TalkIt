// rule-based, 음차만 수정
// - 실제 적용 시에는 key 길이 기준으로 정렬하여
//   복합 개념 / 고유명사를 먼저 치환한다
export function preNormalize(text: string): string {
  if (!text) return text;

  const MAP: Record<string, string> = {
    // ===== 복합 개념 / 고정 표현 =====
    레이스컨디션: 'Race condition',
    '레이스 컨디션': 'Race condition',
    컨텍스트스위칭: 'context switching',
    '컨텍스트 스위칭': 'context switching',
    페이지폴트: 'page fault',
    '페이지 폴트': 'page fault',
    해시인덱스: 'hash index',
    '해시 인덱스': 'hash index',
    키벨류: 'Key-Value',
    키밸류: 'Key-Value',
    '키 밸류': 'Key-Value',
    '키 벨류': 'Key-Value',
    멀티쓰레드: 'multithread',
    멀티스레드: 'multithread',
    '멀티 스레드': 'multithread',
    '멀티 쓰레드': 'multithread',
    '메모리 풀': 'memory pool',
    메모리풀: 'memory pool',

    // ===== OS / HW =====
    오에스: 'OS',
    커널: 'kernel',
    스케줄러: 'scheduler',
    컨텍스트: 'context',

    // ===== CPU / GPU / Memory =====
    씨피유: 'CPU',
    지피유: 'GPU',
    램: 'RAM',
    캐시: 'cache',
    레지스터: 'register',
    인메모리: 'in-memory',
    '인 메모리': 'in-memory',
    메모리: 'memory',
    페이징: 'paging',

    // ===== Process / Thread =====
    프로세스: 'process',
    쓰레드: 'thread',
    스레드: 'thread',

    // ===== Sync / Concurrency =====
    스핀락: 'spinlock',
    뮤텍스: 'mutex',
    세마포어: 'semaphore',
    데드락: 'deadlock',
    '데드 락': 'deadlock',
    대드락: 'deadlock',
    '대드 락': 'deadlock',

    // ===== Network =====
    아이피: 'IP',
    웹소켓: 'websocket',
    '웹 소켓': 'websocket',
    소켓: 'socket',
    패킷: 'packet',
    라우터: 'router',

    // ===== DB / Storage =====
    데이터베이스: 'database',
    디비: 'DB',
    노에스큐엘: 'NoSQL',
    '노 에스 큐엘': 'NoSQL',
    '노 에스큐엘': 'NoSQL',
    '노에스 큐엘': 'NoSQL',
    '노 SQL': 'NoSQL',
    '노 sql': 'NoSQL',
    에스큐엘: 'SQL',
    '에스 큐엘': 'SQL',
    트랜잭션: 'transaction',
    인덱스: 'index',
    해시: 'hash',

    // ===== Backend / API =====
    에이피아이: 'API',
    '에이 피 아이': 'API',
    엔드포인트: 'endpoint',
    '엔드 포인트': 'endpoint',
    리퀘스트: 'request',
    리스폰스: 'response',

    // ===== Programming =====
    펑션: 'function',
    베리어블: 'variable',
    배리어블: 'variable',
    클래스: 'class',
    오브젝트: 'object',

    // ===== Vendor / Product (고유명사) =====
    레디스: 'Redis',
    카프카: 'Kafka',
    몽고디비: 'MongoDB',
    마이에스큐엘: 'MySQL',
    포스트그레스: 'PostgreSQL',
    '포스트 그레스': 'PostgreSQL',
    '포스트 그레 스': 'PostgreSQL',
    엘라스틱서치: 'Elasticsearch',
    래빗엠큐: 'RabbitMQ',
    레빗엠큐: 'RabbitMQ',
    '레빗 엠큐': 'RabbitMQ',
    '레빗 mq': 'RabbitMQ',

    // ===== Cloud / Platform =====
    아마존웹서비스: 'AWS',
    '아마존 웹 서비스': 'AWS',
    '아마존 웹서비스': 'AWS',
    에이더블유에스: 'AWS',
    '에이 더블유 에스': 'AWS',
    구글클라우드: 'GCP',
    '구글 클라우드': 'GCP',
    애저: 'Azure',
    쿠버네티스: 'Kubernetes',
    '쿠버 네티스': 'Kubernetes',
    도커: 'Docker',

    // ===== Language / Framework =====
    자바: 'Java',
    파이썬: 'Python',
    노드제이에스: 'Node.js',
    '노드 제이 에스': 'Node.js',
    '노드 제이에스': 'Node.js',
    '노드 JS': 'Node.js',
    '노드 js': 'Node.js',
    스프링: 'Spring',
    리액트: 'React',

    키: 'Key',
    밸류: 'Value',
    세션: 'Session',
    스토어: 'Store',
  };

  let result = text;

  // key 길이 내림차순 정렬 (긴 것 먼저)
  const entries = Object.entries(MAP).sort(([a], [b]) => b.length - a.length);

  for (const [from, to] of entries) {
    // 조사/공백/문장 끝 고려 + 합성어 방지(앞쪽 경계)
    const regex = new RegExp(`(?<![가-힣A-Za-z0-9])${from}(?=[가-힣\\s.,!?]|$)`, 'g');
    result = result.replace(regex, to);
  }

  // 영문/숫자+키는 분리/치환 (예: V2키 -> V2 key)
  result = result.replace(/([A-Za-z0-9])키(?=[가-힣\s.,!?]|$)/g, '$1 key');

  return result;
}
