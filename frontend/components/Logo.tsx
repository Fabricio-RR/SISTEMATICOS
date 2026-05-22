export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" stroke="#c0392b" strokeWidth="4" fill="white" />
      <circle cx="40" cy="40" r="26" fill="#c0392b" />
      <text x="40" y="47" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="Arial">O</text>
    </svg>
  );
}