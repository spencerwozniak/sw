import styles from './LoadingCircle.module.css';

const LoadingCircle = () => {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingCircle}></div>
    </div>
  );
};

export default LoadingCircle;
