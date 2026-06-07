// Lightweight stroke icons (Lucide-style), currentColor-driven so they invert
// cleanly on the gradient active state. No icon-font / dependency needed.
type P = { size?: number };
const base = (size: number) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

export const QueueIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><rect x="3" y="4" width="18" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" /><rect x="3" y="16" width="18" height="4" rx="1" /></svg>
);

export const HeatmapIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6 9 3Z" /><path d="M9 3v15" /><path d="M15 6v15" /></svg>
);

export const AnalyticsIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" rx="1" /><rect x="12" y="7" width="3" height="10" rx="1" /><rect x="17" y="13" width="3" height="4" rx="1" /></svg>
);

export const SosIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 3a5 5 0 0 0-5 5v3.5c0 .9-.3 1.7-.9 2.4L5 15h14l-1.1-1.1a3.6 3.6 0 0 1-.9-2.4V8a5 5 0 0 0-5-5Z" /><path d="M10 19a2 2 0 0 0 4 0" /><path d="M19 4l1.5 1.5M5 4 3.5 5.5" /></svg>
);

export const GlobeIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" /></svg>
);

export const CollapseIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d="m15 9-2 3 2 3" /></svg>
);

export const ExpandIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d="m13 9 2 3-2 3" /></svg>
);

export const LogoutIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
);

export const SearchIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);

export const ChevronDownIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="m6 9 6 6 6-6" /></svg>
);

export const CheckIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M20 6 9 17l-5-5" /></svg>
);

export const XIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);

export const ShieldIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /></svg>
);

export const DropletIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 3.5c2.5 3 6 6.2 6 10A6 6 0 0 1 6 13.5c0-3.8 3.5-7 6-10Z" /></svg>
);

export const WrenchIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M14.7 6.3a4 4 0 0 1-5.2 5.2L4 17l3 3 5.5-5.5a4 4 0 0 0 5.2-5.2l-2.5 2.5-2.3-.7-.7-2.3 2.5-2.5Z" /></svg>
);

export const MapPinIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M20 10c0 5-8 11-8 11s-8-6-8-11a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
);

export const ExternalLinkIcon = ({ size = 14 }: P) => (
  <svg {...base(size)}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" /></svg>
);

export const SparklesIcon = ({ size = 14 }: P) => (
  <svg {...base(size)}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" /><path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7L19 14Z" /></svg>
);

export const AlertIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 3a5 5 0 0 0-5 5v3.5c0 .9-.3 1.7-.9 2.4L5 15h14l-1.1-1.1a3.6 3.6 0 0 1-.9-2.4V8a5 5 0 0 0-5-5Z" /><path d="M10 19a2 2 0 0 0 4 0" /><path d="M19 4l1.5 1.5M5 4 3.5 5.5" /></svg>
);

export const ChevronsUpDownIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
);

export const PanelIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></svg>
);

export const UpvoteIcon = ({ size = 14 }: P) => (
  <svg {...base(size)}><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
);

export const ClockIcon = ({ size = 14 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

export const LockIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
