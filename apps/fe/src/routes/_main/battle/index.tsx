import PrepareImage from '@/assets/prepare.png';
import { createFileRoute } from '@tanstack/react-router';

const BattlePage = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '400px',
        gap: '24px',
      }}
    >
      {/* 마스코트 이미지 영역 */}
      <img
        src={PrepareImage}
        alt="준비중 마스코트"
        style={{
          width: '500px',
          height: 'auto',
          objectFit: 'contain',
        }}
      />

      {/* 안내 문구 영역 */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
          준비중인 페이지입니다!
        </h2>
        <p style={{ color: '#888' }}>더 좋은 서비스를 위해 열심히 준비하고 있어요.</p>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_main/battle/')({
  component: BattlePage,
});
