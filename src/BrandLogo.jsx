const BrandLogo = ({ animated = false, className = "brand-logo" }) => (
  <svg
    aria-hidden="true"
    className={`${className}${animated ? " brand-logo-animated" : ""}`}
    focusable="false"
    viewBox="0 0 88 88"
  >
    <defs>
      <linearGradient id="brand-skytrace-bg" x1="14" x2="72" y1="10" y2="78">
        <stop offset="0" stopColor="#eff6ff" />
        <stop offset="1" stopColor="#dbeafe" />
      </linearGradient>
      <linearGradient
        id="brand-skytrace-accent"
        x1="26"
        x2="60"
        y1="22"
        y2="62"
      >
        <stop offset="0" stopColor="#38bdf8" />
        <stop offset="1" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <rect
      fill="url(#brand-skytrace-bg)"
      height="72"
      rx="24"
      width="72"
      x="8"
      y="8"
    />
    <circle className="brand-logo-ring" cx="44" cy="44" fill="none" r="23" />
    <circle
      className="brand-logo-ring brand-logo-ring-inner"
      cx="44"
      cy="44"
      fill="none"
      r="13"
    />
    <g className="brand-logo-radar">
      <path className="brand-logo-sweep" d="M44 44 66 32" />
      <circle className="brand-logo-dot" cx="66" cy="32" r="4.5" />
    </g>
    <path
      d="M44.8 17.4c-1.6 0-2.7 1.1-2.7 2.9v11.2L23.9 37c-1.6.5-2 2.5-.8 3.7l3.8 3.9c.7.8 1.8 1 2.8.6L42 40.6v12.3l-2.6 5c-.3.4-.2 1 .1 1.4l2.3 3.2c.8 1 2.2 1 3 0l2.3-3.2c.3-.4.4-1 .1-1.4l-2.6-5V40.6l12.3 4.6c1 .4 2.1.2 2.8-.6l3.8-3.9c1.2-1.2.8-3.2-.8-3.7l-18.2-5.6V20.3c0-1.8-1.1-2.9-2.7-2.9Z"
      fill="url(#brand-skytrace-accent)"
      stroke="#082f49"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <path className="brand-logo-trail" d="M20 60c8.5 4.7 19.4 6.4 31 4.6" />
  </svg>
);

export default BrandLogo;
