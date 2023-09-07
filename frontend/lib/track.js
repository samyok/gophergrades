const trackEvent = (event, data) => {
  if (typeof window === "undefined") return;
  if (window.umami) {
    window.umami.track(event, { data });
  }
};

export default trackEvent;
