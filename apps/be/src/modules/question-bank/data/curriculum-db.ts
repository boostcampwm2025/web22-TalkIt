import { Curriculum } from './curriculum.types';

export const DB_CURRICULUM: Curriculum = {
  domain: 'DB',
  chapters: [
    {
      chapter: 1,
      title: '데이터베이스 기초',
      keyConcepts: [
        { term: '데이터베이스 정의와 DBMS', conceptLevel: 'Basic' },
        { term: 'Schema와 Instance', conceptLevel: 'Basic' },
        { term: '3단계 스키마 아키텍처 (외부, 개념, 내부)', conceptLevel: 'Intermediate' },
        { term: 'Data Independence(데이터 독립성)', conceptLevel: 'Intermediate' },
        { term: 'DBMS 구성 요소', conceptLevel: 'Intermediate' },
        { term: 'DBMS 선택 기준과 트레이드오프', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 2,
      title: '관계형 모델과 SQL',
      keyConcepts: [
        { term: 'Relation, Tuple, Attribute', conceptLevel: 'Basic' },
        { term: 'Key의 종류 (Super, Candidate, Primary, Foreign)', conceptLevel: 'Basic' },
        { term: 'JOIN의 종류와 원리 (INNER, OUTER, SELF)', conceptLevel: 'Intermediate' },
        { term: 'SQL DDL / DML / DCL', conceptLevel: 'Intermediate' },
        { term: 'Subquery vs CTE vs Window Function', conceptLevel: 'Intermediate' },
        { term: '무결성 제약 조건 (Integrity Constraints)', conceptLevel: 'Intermediate' },
        { term: 'Execution Plan 분석', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 3,
      title: '데이터 모델링과 정규화',
      keyConcepts: [
        { term: 'ER Model(Entity-Relationship)', conceptLevel: 'Basic' },
        { term: '이상 현상(Anomaly)의 종류', conceptLevel: 'Basic' },
        { term: 'Functional Dependency(함수 종속)', conceptLevel: 'Intermediate' },
        { term: '정규화(1NF ~ BCNF)', conceptLevel: 'Intermediate' },
        { term: '반정규화(Denormalization)', conceptLevel: 'Advanced' },
        { term: '데이터 모델링 실무 (정규화 vs 성능)', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 4,
      title: '인덱스와 성능 최적화',
      keyConcepts: [
        { term: 'Index 개념과 종류', conceptLevel: 'Basic' },
        { term: 'B-Tree / B+Tree 인덱스', conceptLevel: 'Intermediate' },
        { term: 'Clustered vs Non-clustered Index', conceptLevel: 'Intermediate' },
        { term: 'Multi-column Index (가장 왼쪽 접두사 규칙)', conceptLevel: 'Intermediate' },
        { term: 'Covering Index 및 Index Skip Scan', conceptLevel: 'Advanced' },
        { term: '인덱스 설계 전략과 주의사항', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 5,
      title: '트랜잭션과 동시성 제어',
      keyConcepts: [
        { term: 'Transaction과 ACID', conceptLevel: 'Basic' },
        { term: 'Commit과 Rollback', conceptLevel: 'Basic' },
        { term: 'Isolation Level(Read Uncommitted ~ Serializable)', conceptLevel: 'Intermediate' },
        { term: 'Lock(Shared Lock, Exclusive Lock)', conceptLevel: 'Intermediate' },
        { term: 'MVCC(Multi-Version Concurrency Control)', conceptLevel: 'Advanced' },
        { term: 'Deadlock Detection과 해결', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 6,
      title: '저장 매커니즘과 쿼리 프로세싱',
      keyConcepts: [
        { term: 'Buffer Pool 및 페이지 교체 알고리즘', conceptLevel: 'Intermediate' },
        { term: 'Log 기반 회복 (WAL, Undo/Redo Log)', conceptLevel: 'Intermediate' },
        { term: 'Query Optimizer (CBO vs RBO)', conceptLevel: 'Intermediate' },
        { term: 'Join 매커니즘 (Nested Loop, Hash, Sort-Merge)', conceptLevel: 'Advanced' },
        { term: 'Checkpointing과 장애 복구 과정', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 7,
      title: 'NoSQL과 분산 아키텍처',
      keyConcepts: [
        { term: 'NoSQL 데이터 모델 (Key-Value, Document 등)', conceptLevel: 'Basic' },
        { term: 'CAP Theorem과 PACELC 이론', conceptLevel: 'Intermediate' },
        { term: 'Replication (Master-Slave, Multi-Master)', conceptLevel: 'Intermediate' },
        { term: 'Sharding 및 가용성 전략', conceptLevel: 'Advanced' },
        { term: 'Eventual Consistency와 분산 트랜잭션', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 8,
      title: '운영 및 고가용성 전략',
      keyConcepts: [
        { term: 'Connection Pool 원리', conceptLevel: 'Basic' },
        { term: 'Slow Query 진단 및 프로파일링', conceptLevel: 'Intermediate' },
        { term: 'Database Partitioning (Horizontal vs Vertical)', conceptLevel: 'Intermediate' },
        { term: 'Read Replica와 CQRS 패턴 기초', conceptLevel: 'Advanced' },
        { term: 'Zero-downtime Migration 전략', conceptLevel: 'Advanced' },
      ],
    },
  ],
};
