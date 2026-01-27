import { Injectable } from '@nestjs/common';

/**
 * 보수적인 키워드 추출기
 * - 사용자 답변 원문에서 실제로 언급된 기술 용어만 추출
 * - 고유명사는 원어 유지(React, HTTP 등), 일반 CS 개념은 한국어 허용
 * - 최대 5개
 */
@Injectable()
export class KeywordExtractorService {
  private readonly known = [
    // Protocols / OSI
    'HTTP', 'HTTPS', 'TCP', 'UDP', 'IP', 'DNS', 'gRPC', 'REST', 'GraphQL',
    // Languages / Runtimes
    'Java', 'JavaScript', 'TypeScript', 'Python', 'Go', 'C', 'C++', 'Rust', 'Kotlin', 'Swift', 'Node.js', 'JVM',
    // Frameworks / Libs
    'React', 'Next.js', 'Vue', 'Angular', 'Spring', 'Spring Boot', 'Django', 'Flask', 'Express',
    // Databases
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'MariaDB',
    // Infra / Cloud
    'Docker', 'Kubernetes', 'K8s', 'AWS', 'GCP', 'Azure', 'S3', 'EC2', 'Lambda',
    // CS Concepts (Korean widely used)
    '운영체제', '프로세스', '스레드', '메모리 관리', '가비지 컬렉션', '동기화', '뮤텍스', '세마포어', '데드락',
    '캐시', '페이징', '세그먼테이션', 'B-Tree', '해시 테이블', '트랜잭션', 'ACID', 'CAP', '일관성 모델',
  ];

  extract(answerText: string): string[] {
    const text = String(answerText ?? '');
    if (!text.trim()) return [];

    const found = new Set<string>();

    // 1) Known entities (case-sensitive scan first, then case-insensitive where needed)
    for (const term of this.known) {
      // plain inclusion with word boundary handling
      const pattern = this.buildWordBoundaryRegex(term);
      if (pattern.test(text)) found.add(term);
    }

    // 2) Simple heuristics: ALLCAP sequences ≥2 letters (e.g., CPU, IO, SQL)
    const caps = Array.from(text.matchAll(/\b([A-Z]{2,}(?:\.[A-Z]{2,})?)\b/g))
      .map((m) => m[1])
      .filter((v): v is string => typeof v === 'string');
    for (const c of caps) {
      // Normalize known aliases
      const norm = c.replace(/\.$/, '');
      if (norm.length >= 2) found.add(norm);
    }

    // 3) Korean CS common terms spotted directly in text
    const koList = ['운영체제', '프로세스', '스레드', '동기화', '데드락', '메모리', '캐시', '페이지 교체', '가비지 컬렉션'];
    for (const k of koList) {
      if (text.includes(k)) found.add(k);
    }

    // Output up to 5, keep insertion order by scanning known list first
    const ordered: string[] = [];
    for (const term of this.known) if (found.has(term)) ordered.push(term);
    // add remaining that are not in known
    for (const term of found) if (!this.known.includes(term)) ordered.push(term);

    return ordered.slice(0, 5);
  }

  private buildWordBoundaryRegex(term: string): RegExp {
    // Escape regex
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow dot in things like Node.js, Next.js
    if (/\./.test(term)) {
      return new RegExp(`(?:^|[^A-Za-z0-9])${esc}(?:$|[^A-Za-z0-9])`);
    }
    return new RegExp(`\\b${esc}\\b`);
  }
}
