import Navigation from '@/components/Navigation';
import NavButton from '@/components/NavButton';
import styles from './not-found.module.css'; // create this CSS module

function NotFound() {
  return (
    <div className={styles.notFoundContainer}>
      <h1>404 Not Found</h1>
      <p>This webpage does not exist.</p>
      <NavButton to="/" label="Return Home" className={styles.ctaButton} />
      <Navigation />
    </div>
  );
}

export default NotFound;