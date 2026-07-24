const Skeleton = ({ rows = 5 }) => (
  <div style={{ padding: '8px 0' }}>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="skel-row" style={{ opacity: 1 - index * 0.12 }} />
    ))}
  </div>
);

export default Skeleton;
