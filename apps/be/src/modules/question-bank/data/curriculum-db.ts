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
        { term: 'Data Independence(데이터 독립성)', conceptLevel: 'Intermediate' },
        { term: '3단계 스키마 아키텍처', conceptLevel: 'Intermediate' },
        { term: 'DBMS 구성 요소', conceptLevel: 'Intermediate' },
        { term: 'DBMS 선택 기준과 트레이드오프', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 2,
      title: '관계형 모델과 SQL',
      keyConcepts: [
        { term: 'Relation, Tuple, Attribute', conceptLevel: 'Basic' },
        { term: 'Primary Key와 Foreign Key', conceptLevel: 'Basic' },
        { term: 'SQL DDL / DML / DCL', conceptLevel: 'Intermediate' },
        { term: 'JOIN(INNER, OUTER, CROSS)', conceptLevel: 'Intermediate' },
        { term: 'Subquery와 CTE', conceptLevel: 'Intermediate' },
        { term: 'Execution Plan 분석', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 3,
      title: '데이터 모델링과 정규화',
      keyConcepts: [
        { term: 'ER Model(Entity-Relationship)', conceptLevel: 'Basic' },
        { term: 'Functional Dependency(함수 종속)', conceptLevel: 'Intermediate' },
        { term: '정규화(1NF ~ BCNF)', conceptLevel: 'Intermediate' },
        { term: '반정규화(Denormalization)', conceptLevel: 'Intermediate' },
        { term: '이상 현상(Anomaly)', conceptLevel: 'Intermediate' },
        { term: '정규화 vs 반정규화 설계 판단', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 4,
      title: '인덱스와 성능 최적화',
      keyConcepts: [
        { term: 'Index 개념과 종류', conceptLevel: 'Basic' },
        { term: 'B-Tree / B+Tree 인덱스', conceptLevel: 'Intermediate' },
        { term: 'Clustered vs Non-clustered Index', conceptLevel: 'Intermediate' },
        { term: 'Covering Index', conceptLevel: 'Intermediate' },
        { term: 'Index Scan vs Full Table Scan', conceptLevel: 'Intermediate' },
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
      title: '저장 구조와 쿼리 처리',
      keyConcepts: [
        { term: 'Disk 기반 저장 구조', conceptLevel: 'Basic' },
        { term: 'Buffer Pool(Buffer Cache)', conceptLevel: 'Intermediate' },
        { term: 'WAL(Write-Ahead Logging)', conceptLevel: 'Intermediate' },
        { term: 'Query Optimizer', conceptLevel: 'Intermediate' },
        { term: 'Hash Join vs Nested Loop Join vs Sort-Merge Join', conceptLevel: 'Advanced' },
        { term: 'Partitioning 전략', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 7,
      title: 'NoSQL과 분산 데이터베이스',
      keyConcepts: [
        { term: 'NoSQL 유형(Key-Value, Document, Column, Graph)', conceptLevel: 'Basic' },
        { term: 'CAP Theorem', conceptLevel: 'Intermediate' },
        { term: 'Replication(복제)', conceptLevel: 'Intermediate' },
        { term: 'Sharding(샤딩)', conceptLevel: 'Intermediate' },
        { term: 'Eventual Consistency', conceptLevel: 'Advanced' },
        { term: 'SQL vs NoSQL 선택 기준', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 8,
      title: '데이터베이스 설계와 운영',
      keyConcepts: [
        { term: 'Backup과 Recovery', conceptLevel: 'Basic' },
        { term: 'Connection Pool', conceptLevel: 'Intermediate' },
        { term: 'Slow Query 진단', conceptLevel: 'Intermediate' },
        { term: 'Database Migration 전략', conceptLevel: 'Intermediate' },
        { term: 'Read Replica와 Write-Read 분리', conceptLevel: 'Advanced' },
        { term: '대용량 데이터 처리 전략', conceptLevel: 'Advanced' },
      ],
    },
  ],
};
