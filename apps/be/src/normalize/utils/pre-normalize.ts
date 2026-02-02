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
    페이지폴트: 'page fault',
    해시인덱스: 'hash index',
    키벨류: 'Key-Value',
    키밸류: 'Key-Value',
    멀티쓰레드: 'multithread',
    멀티스레드: 'multithread',

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
    락: 'lock',

    // ===== Network =====
    아이피: 'IP',
    웹소켓: 'websocket',
    소켓: 'socket',
    패킷: 'packet',
    라우터: 'router',

    // ===== DB / Storage =====
    데이터베이스: 'database',
    디비: 'DB',
    노에스큐엘: 'NoSQL',
    에스큐엘: 'SQL',
    트랜잭션: 'transaction',
    인덱스: 'index',
    해시: 'hash',

    // ===== Backend / API =====
    에이피아이: 'API',
    엔드포인트: 'endpoint',
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
    엘라스틱서치: 'Elasticsearch',
    레빗엠큐: 'RabbitMQ',

    // ===== Cloud / Platform =====
    아마존웹서비스: 'AWS',
    에이더블유에스: 'AWS',
    구글클라우드: 'GCP',
    애저: 'Azure',
    쿠버네티스: 'Kubernetes',
    도커: 'Docker',

    // ===== Language / Framework =====
    자바: 'Java',
    파이썬: 'Python',
    노드: 'Node.js',
    스프링: 'Spring',
    리액트: 'React',
  };

  let result = text;

  // key 길이 내림차순 정렬 (긴 것 먼저)
  const entries = Object.entries(MAP).sort(([a], [b]) => b.length - a.length);

  for (const [from, to] of entries) {
    // 조사/공백/문장 끝 고려
    const regex = new RegExp(`${from}(?=[가-힣\\s.,!?]|$)`, 'g');
    result = result.replace(regex, to);
  }

  return result;
}
