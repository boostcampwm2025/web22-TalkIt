import { Curriculum } from './curriculum.types';

export const DATA_STRUCTURE_CURRICULUM: Curriculum = {
  domain: 'DATA_STRUCTURE',
  chapters: [
    {
      chapter: 1,
      title: '배열과 문자열',
      keyConcepts: [
        { term: 'Array 기본 개념과 특성', conceptLevel: 'Basic' },
        { term: 'Static Array vs Dynamic Array', conceptLevel: 'Basic' },
        { term: 'String과 문자열 처리', conceptLevel: 'Intermediate' },
        { term: 'Two Pointer / Sliding Window', conceptLevel: 'Intermediate' },
        { term: 'Time Complexity(시간 복잡도)', conceptLevel: 'Intermediate' },
        { term: 'Cache Locality와 배열 성능', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 2,
      title: '연결 리스트',
      keyConcepts: [
        { term: 'Linked List 기본 개념', conceptLevel: 'Basic' },
        { term: 'Singly vs Doubly vs Circular Linked List', conceptLevel: 'Basic' },
        { term: 'Array vs Linked List 비교', conceptLevel: 'Intermediate' },
        { term: 'Linked List 연산(삽입, 삭제, 탐색)', conceptLevel: 'Intermediate' },
        { term: 'Skip List', conceptLevel: 'Advanced' },
        { term: 'Memory Pool과 Linked List 최적화', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 3,
      title: '스택과 큐',
      keyConcepts: [
        { term: 'Stack 개념과 연산', conceptLevel: 'Basic' },
        { term: 'Queue 개념과 연산', conceptLevel: 'Basic' },
        { term: 'Deque(Double-ended Queue)', conceptLevel: 'Basic' },
        { term: 'Circular Queue', conceptLevel: 'Intermediate' },
        { term: 'Stack/Queue 활용(괄호 매칭, 시스템 스택)', conceptLevel: 'Intermediate' },
        { term: 'Monotonic Stack / Queue', conceptLevel: 'Advanced' },
        { term: 'Lock-free Queue 개념', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 4,
      title: '트리',
      keyConcepts: [
        { term: 'Tree 기본 용어와 속성', conceptLevel: 'Basic' },
        { term: 'Binary Tree와 순회(전위, 중위, 후위)', conceptLevel: 'Basic' },
        { term: 'Binary Search Tree(BST)', conceptLevel: 'Intermediate' },
        { term: 'AVL Tree / Red-Black Tree', conceptLevel: 'Advanced' },
        { term: 'B-Tree / B+Tree (DB Index 구조)', conceptLevel: 'Advanced' },
        { term: 'Trie(Prefix Tree) 및 Segment Tree', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 5,
      title: '힙과 우선순위 큐',
      keyConcepts: [
        { term: 'Heap 개념과 종류(Min/Max Heap)', conceptLevel: 'Basic' },
        { term: 'Heap 연산(삽입, 삭제)', conceptLevel: 'Basic' },
        { term: 'Heapify와 Heap 구성', conceptLevel: 'Intermediate' },
        { term: 'Heap Sort', conceptLevel: 'Intermediate' },
        { term: 'Priority Queue 활용(Top-K, Median)', conceptLevel: 'Advanced' },
        { term: 'Fibonacci Heap', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 6,
      title: '해시 테이블',
      keyConcepts: [
        { term: 'Hash Table 개념과 Hash Function', conceptLevel: 'Basic' },
        { term: 'Collision(충돌)과 해결 방법', conceptLevel: 'Basic' },
        { term: 'Chaining vs Open Addressing', conceptLevel: 'Intermediate' },
        { term: 'Load Factor와 Rehashing', conceptLevel: 'Intermediate' },
        { term: 'Consistent Hashing', conceptLevel: 'Advanced' },
        { term: 'Bloom Filter', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 7,
      title: '그래프',
      keyConcepts: [
        { term: 'Graph 기본 개념(정점, 간선, 방향/무방향)', conceptLevel: 'Basic' },
        { term: '그래프 표현(인접 행렬, 인접 리스트)', conceptLevel: 'Basic' },
        { term: 'BFS(너비 우선 탐색)', conceptLevel: 'Intermediate' },
        { term: 'DFS(깊이 우선 탐색)', conceptLevel: 'Intermediate' },
        { term: 'Union-Find (Disjoint Set)', conceptLevel: 'Intermediate' },
        { term: 'Topological Sort (위상 정렬)', conceptLevel: 'Intermediate' },
        { term: '최단 경로(Dijkstra, Bellman-Ford, Floyd)', conceptLevel: 'Advanced' },
        { term: 'MST(Kruskal, Prim)', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 8,
      title: '정렬과 탐색',
      keyConcepts: [
        { term: '기본 정렬(Bubble, Selection, Insertion)', conceptLevel: 'Basic' },
        { term: 'Binary Search', conceptLevel: 'Basic' },
        { term: 'Merge Sort와 Quick Sort', conceptLevel: 'Intermediate' },
        { term: '정렬 알고리즘 비교(시간/공간 복잡도)', conceptLevel: 'Intermediate' },
        { term: 'Counting Sort / Radix Sort', conceptLevel: 'Advanced' },
        { term: '정렬 알고리즘 선택 기준과 Stable Sort', conceptLevel: 'Advanced' },
      ],
    },
  ],
};
