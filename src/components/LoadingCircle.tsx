const LoadingCircle = () => {
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-bg/60">
      <div className="size-[30px] animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
};

export default LoadingCircle;
