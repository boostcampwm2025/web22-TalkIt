import { useMemo, useRef } from 'react';

import { ContactShadows, OrbitControls, Text } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { CuboidCollider, Physics, RapierRigidBody, RigidBody } from '@react-three/rapier';

import * as THREE from 'three';

// 책의 크기 상수
const BOOK_DIMS = { width: 2.2, height: 0.45, depth: 1.6 };

// 랜덤한 색상을 생성하는 함수 (표지 색상)
const getRandomColor = () => {
  const randomColor = Math.floor(Math.random() * 16777215).toString(16);
  return '#' + randomColor.padStart(6, '0');
};

type QuestionItem = {
  content: string;
  type: 'NORMAL' | 'TAIL';
  score: number;
};

type FallingBooksSceneProps = {
  questions: QuestionItem[];
};

type FallingBookProps = {
  title: string;
  type: 'NORMAL' | 'TAIL'; // [추가됨] 타입 정보
  index: number;
  total: number;
};

/**
 * 개별 책 컴포넌트
 */
const FallingBook = ({ title, index, total }: FallingBookProps) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const color = useMemo(() => getRandomColor(), []);
  const startY = 3.5 + (total - 1 - index) * 1.2; // 책이 떨어지기 시작하는 높이

  // 매 프레임마다 실행
  useFrame(() => {
    if (!rigidBodyRef.current) return;

    const body = rigidBodyRef.current;

    // 회전값을 고정하여 책이 부딪히면서 회전하지 않고 일자로 차곡차곡 쌓이게 함
    const targetRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    body.setRotation(targetRotation, true);

    // 현재 이동 속도와 회전 속도를 가져옵니다.
    const linvel = body.linvel();
    const angvel = body.angvel();

    // 속도의 크기(magnitude)를 계산
    const linearSpeed = Math.sqrt(linvel.x ** 2 + linvel.y ** 2 + linvel.z ** 2);
    const angularSpeed = Math.sqrt(angvel.x ** 2 + angvel.y ** 2 + angvel.z ** 2);

    // 속도의 크기가 0.1 미만이면 즉, 모든 책이 다 쌓였으면
    if (linearSpeed < 0.1 && angularSpeed < 0.1) {
      // 물리 엔진이 더 이상 연산하지 않도록 '수면(Sleep)' 상태로 강제 전환
      body.sleep();
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[0, startY, 0]} // 초기 위치
      colliders={false}
      canSleep={true}
      restitution={0.1} // 탄성
      friction={10} // 마찰력
      linearDamping={1} // 이동 공기 저항
      angularDamping={1} // 회전 공기 저항
      mass={5} // 무게
    >
      {/* 눈에 보이지 않는 물리적인 충돌 감지 영역 */}
      <CuboidCollider args={[BOOK_DIMS.width / 2, BOOK_DIMS.height / 2, BOOK_DIMS.depth / 2]} />
      <group>
        {/* 책 표지 */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[BOOK_DIMS.width, BOOK_DIMS.height, BOOK_DIMS.depth]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>

        {/* 책 제목 */}
        <group position={[0, 0, BOOK_DIMS.depth / 2 + 0.01]}>
          <Text
            color="white"
            anchorX="center"
            anchorY="middle"
            fontSize={0.1}
            fontWeight={700}
            letterSpacing={0.02}
            maxWidth={BOOK_DIMS.width * 0.8}
          >
            {title.length > 30 ? title.slice(0, 30) + '...' : title}
          </Text>
        </group>

        {/* 책의 사이드 종이 부분 */}
        <mesh position={[BOOK_DIMS.width / 2, 0, 0]}>
          <boxGeometry args={[0.02, BOOK_DIMS.height - 0.05, BOOK_DIMS.depth - 0.1]} />
          <meshStandardMaterial color="#F5F5F5" />
        </mesh>
        <mesh position={[-BOOK_DIMS.width / 2 - 0.01, 0, 0]}>
          <boxGeometry args={[0, BOOK_DIMS.height - 0.05, BOOK_DIMS.depth - 0.1]} />
          <meshStandardMaterial color="#F5F5F5" />
        </mesh>
        <mesh position={[0, 0, -BOOK_DIMS.depth / 2 - 0.01]}>
          <boxGeometry args={[BOOK_DIMS.width - 0.05, BOOK_DIMS.height - 0.05, 0.02]} />
          <meshStandardMaterial color="#F5F5F5" />
        </mesh>
      </group>
    </RigidBody>
  );
};

/**
 * 씬 컨텐츠 컴포넌트 (조명, 물리 세계 설정, 카메라 컨트롤)
 */
const SceneContent = ({ questions }: { questions: QuestionItem[] }) => {
  return (
    <>
      {/* 조명 설정 */}
      <ambientLight intensity={0.6} />
      <directionalLight
        castShadow
        position={[64, 64, 128]}
        intensity={1}
        shadow-mapSize={[1024, 1024]}
      >
        <orthographicCamera attach="shadow-camera" args={[-8, 8, -8, 8, 0.1, 30]} />
      </directionalLight>

      {/* 카메라 컨트롤 */}
      <OrbitControls
        makeDefault
        target={[0, 1, 0]}
        enablePan={true} // 오른쪽 클릭으로 카메라 이동 가능
        enableZoom={true} // 카메라 줌 가능
        minDistance={5}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />

      {/* 물리 엔진 세계 설정 */}
      <Physics gravity={[0, -10, 0]}>
        {/* 바닥 */}
        <RigidBody type="fixed" position={[0, -0.5, 0]} friction={1}>
          <CuboidCollider args={[15, 0.5, 10]} />
        </RigidBody>

        {/* 바닥에 생기는 그림자 */}
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.7}
          scale={8}
          blur={1.5}
          far={2}
          color="#000000"
        />

        {/* 답변했던 질문 목록을 순회하며 떨어지는 책 컴포넌트들을 생성 */}
        <group>
          {questions.map((item, index) => (
            <FallingBook
              key={`book-${index}`}
              title={item.content}
              type={item.type}
              index={index}
              total={questions.length}
            />
          ))}
        </group>
      </Physics>
    </>
  );
};

export default function FallingBooksScene({ questions }: FallingBooksSceneProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <Canvas
      shadows
      camera={{ position: [0, 3, 10], fov: 30 }}
      gl={{ alpha: true, antialias: true }}
      className="h-full w-full cursor-move"
    >
      <SceneContent questions={questions} />
    </Canvas>
  );
}
