import { Curriculum } from './curriculum.types';

export const NETWORK_CURRICULUM: Curriculum = {
  domain: 'NETWORK',
  chapters: [
    {
      chapter: 1,
      title: '네트워크 기초와 모델',
      keyConcepts: [
        { term: '네트워크 정의와 분류(LAN, WAN)', conceptLevel: 'Basic' },
        { term: 'OSI 7계층 모델', conceptLevel: 'Basic' },
        { term: 'TCP/IP 4계층 모델', conceptLevel: 'Basic' },
        { term: '캡슐화와 역캡슐화', conceptLevel: 'Intermediate' },
        { term: 'PDU(Protocol Data Unit) 개념', conceptLevel: 'Intermediate' },
        { term: 'L2/L3/L4/L7 스위치 차이', conceptLevel: 'Advanced' },
        { term: 'End-to-End Principle', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 2,
      title: '데이터 링크 계층',
      keyConcepts: [
        { term: 'MAC Address', conceptLevel: 'Basic' },
        { term: 'Ethernet', conceptLevel: 'Basic' },
        { term: 'ARP(Address Resolution Protocol)', conceptLevel: 'Intermediate' },
        { term: 'Switch와 VLAN', conceptLevel: 'Intermediate' },
        { term: '흐름 제어와 오류 제어', conceptLevel: 'Intermediate' },
        { term: 'Spanning Tree Protocol', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 3,
      title: '네트워크 계층과 IP',
      keyConcepts: [
        { term: 'IP Address(IPv4, IPv6)', conceptLevel: 'Basic' },
        { term: 'Subnet과 CIDR', conceptLevel: 'Basic' },
        { term: 'Routing 기초', conceptLevel: 'Intermediate' },
        { term: 'NAT(Network Address Translation)', conceptLevel: 'Intermediate' },
        { term: 'ICMP와 ping/traceroute', conceptLevel: 'Intermediate' },
        { term: 'Routing Protocol(RIP, OSPF, BGP)', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 4,
      title: '전송 계층(TCP/UDP)',
      keyConcepts: [
        { term: 'TCP vs UDP', conceptLevel: 'Basic' },
        { term: 'Port와 Socket', conceptLevel: 'Basic' },
        { term: 'TCP 3-way / 4-way Handshake', conceptLevel: 'Intermediate' },
        { term: 'TCP 흐름 제어(Sliding Window)', conceptLevel: 'Intermediate' },
        { term: 'TCP 혼잡 제어(Slow Start, AIMD)', conceptLevel: 'Advanced' },
        { term: 'TCP Retransmission과 Timeout', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 5,
      title: '응용 계층 프로토콜',
      keyConcepts: [
        { term: 'DNS', conceptLevel: 'Basic' },
        { term: 'HTTP/HTTPS', conceptLevel: 'Basic' },
        { term: 'HTTP Method와 Status Code', conceptLevel: 'Intermediate' },
        { term: 'Cookie와 Session', conceptLevel: 'Intermediate' },
        { term: 'REST API', conceptLevel: 'Intermediate' },
        { term: 'HTTP/2와 HTTP/3(QUIC)', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 6,
      title: '네트워크 보안',
      keyConcepts: [
        { term: '대칭키와 비대칭키 암호화', conceptLevel: 'Basic' },
        { term: 'TLS/SSL Handshake', conceptLevel: 'Intermediate' },
        { term: '인증서와 CA(Certificate Authority)', conceptLevel: 'Intermediate' },
        { term: 'CORS(Cross-Origin Resource Sharing)', conceptLevel: 'Intermediate' },
        { term: 'XSS, CSRF, SQL Injection', conceptLevel: 'Advanced' },
        { term: '방화벽과 IDS/IPS', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 7,
      title: '소켓 프로그래밍',
      keyConcepts: [
        { term: 'Socket 개념과 종류', conceptLevel: 'Basic' },
        { term: 'Blocking vs Non-blocking I/O', conceptLevel: 'Intermediate' },
        { term: 'I/O Multiplexing(select, poll, epoll)', conceptLevel: 'Intermediate' },
        { term: 'WebSocket', conceptLevel: 'Intermediate' },
        { term: 'Event-driven Architecture', conceptLevel: 'Advanced' },
        { term: 'C10K Problem', conceptLevel: 'Advanced' },
      ],
    },
    {
      chapter: 8,
      title: '웹 네트워크와 인프라',
      keyConcepts: [
        { term: 'CDN(Content Delivery Network)', conceptLevel: 'Basic' },
        { term: 'Load Balancer', conceptLevel: 'Intermediate' },
        { term: 'Proxy와 Reverse Proxy', conceptLevel: 'Intermediate' },
        { term: 'DNS Round Robin과 GSLB', conceptLevel: 'Intermediate' },
        { term: 'MSA에서의 Service Discovery', conceptLevel: 'Advanced' },
        { term: '네트워크 성능 최적화', conceptLevel: 'Advanced' },
      ],
    },
  ],
};
