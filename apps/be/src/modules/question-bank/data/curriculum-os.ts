import { Curriculum } from './curriculum.types';

export const OS_CURRICULUM: Curriculum = {
  domain: 'OS',
  chapters: [
    {
      chapter: 1,
      title: '운영체제 개요 및 구조',
      keyConcepts: [
        { term: '운영체제 정의와 역할', conceptLevel: 'Basic' },
        { term: 'Kernel', conceptLevel: 'Basic' },
        { term: 'System Call', conceptLevel: 'Intermediate' },
        { term: 'Interrupt', conceptLevel: 'Intermediate' },
        { term: 'Dual Mode', conceptLevel: 'Intermediate' },
        { term: '운영체제 구조(모놀리식, 마이크로커널)', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 2,
      title: '프로세스 관리',
      keyConcepts: [
        { term: 'Process', conceptLevel: 'Basic' },
        { term: 'PCB(Process Control Block)', conceptLevel: 'Basic' },
        { term: 'Process State', conceptLevel: 'Basic' },
        { term: 'Context Switch', conceptLevel: 'Intermediate' },
        { term: 'fork()와 exec()', conceptLevel: 'Intermediate' },
        { term: 'IPC(Inter-Process Communication)', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 3,
      title: '스레드와 동시성',
      keyConcepts: [
        { term: 'Thread', conceptLevel: 'Basic' },
        { term: 'Process vs Thread', conceptLevel: 'Basic' },
        { term: 'User-Level Thread vs Kernel-Level Thread', conceptLevel: 'Intermediate' },
        { term: 'Multi-threading Model', conceptLevel: 'Intermediate' },
        { term: 'Thread Pool', conceptLevel: 'Intermediate' },
        { term: 'Thread Safety', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 4,
      title: 'CPU 스케줄링',
      keyConcepts: [
        { term: 'CPU Scheduler', conceptLevel: 'Basic' },
        { term: 'Preemptive vs Non-preemptive', conceptLevel: 'Basic' },
        { term: 'FCFS / SJF / Priority / Round Robin', conceptLevel: 'Intermediate' },
        { term: 'Multilevel Queue', conceptLevel: 'Intermediate' },
        { term: 'Starvation과 Aging', conceptLevel: 'Intermediate' },
        { term: 'Real-time Scheduling', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 5,
      title: '프로세스 동기화',
      keyConcepts: [
        { term: 'Race Condition', conceptLevel: 'Basic' },
        { term: 'Critical Section', conceptLevel: 'Basic' },
        { term: 'Mutex와 Semaphore', conceptLevel: 'Intermediate' },
        { term: 'Monitor', conceptLevel: 'Intermediate' },
        { term: 'Spinlock', conceptLevel: 'Intermediate' },
        { term: 'Producer-Consumer / Readers-Writers 문제', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 6,
      title: '교착 상태(Deadlock)',
      keyConcepts: [
        { term: 'Deadlock 정의와 조건', conceptLevel: 'Basic' },
        { term: 'Resource Allocation Graph', conceptLevel: 'Basic' },
        { term: 'Deadlock Prevention', conceptLevel: 'Intermediate' },
        { term: "Deadlock Avoidance(Banker's Algorithm)", conceptLevel: 'Intermediate' },
        { term: 'Deadlock Detection & Recovery', conceptLevel: 'Advanced' },
        { term: 'Livelock과 Starvation', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 7,
      title: '메모리 관리',
      keyConcepts: [
        { term: 'Logical Address vs Physical Address', conceptLevel: 'Basic' },
        { term: 'Contiguous Memory Allocation', conceptLevel: 'Basic' },
        { term: 'Paging', conceptLevel: 'Intermediate' },
        { term: 'Segmentation', conceptLevel: 'Intermediate' },
        { term: 'Page Table 구조', conceptLevel: 'Intermediate' },
        { term: 'TLB(Translation Lookaside Buffer)', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 8,
      title: '가상 메모리',
      keyConcepts: [
        { term: 'Virtual Memory 개념', conceptLevel: 'Basic' },
        { term: 'Demand Paging', conceptLevel: 'Basic' },
        { term: 'Page Fault', conceptLevel: 'Intermediate' },
        { term: 'Page Replacement Algorithm(FIFO, LRU, Optimal)', conceptLevel: 'Intermediate' },
        { term: 'Thrashing', conceptLevel: 'Advanced' },
        { term: 'Working Set Model', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 9,
      title: '파일 시스템',
      keyConcepts: [
        { term: 'File과 Directory 구조', conceptLevel: 'Basic' },
        { term: 'File Allocation(연속, 연결, 인덱스)', conceptLevel: 'Intermediate' },
        { term: 'Free Space Management', conceptLevel: 'Intermediate' },
        { term: 'Inode', conceptLevel: 'Intermediate' },
        { term: 'Journaling File System', conceptLevel: 'Advanced' },
        { term: 'VFS(Virtual File System)', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 10,
      title: 'I/O 시스템',
      keyConcepts: [
        { term: 'I/O Hardware 기초', conceptLevel: 'Basic' },
        { term: 'Polling vs Interrupt-driven I/O', conceptLevel: 'Basic' },
        { term: 'DMA(Direct Memory Access)', conceptLevel: 'Intermediate' },
        { term: 'Buffering과 Caching', conceptLevel: 'Intermediate' },
        { term: 'Disk Scheduling(SCAN, C-SCAN, LOOK)', conceptLevel: 'Advanced' },
        { term: 'RAID', conceptLevel: 'Advanced' },
      ],
    },
  ],
};
