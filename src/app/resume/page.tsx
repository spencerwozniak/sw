// Full revised version of /resume page with all CV sections and full content

import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Chatbot from '@/components/Chatbot';
import NavButton from '@/components/NavButton';
import Footer from '@/components/Footer';
import styles from './page.module.css';

import { 
  FaGraduationCap,
  FaHandsHelping, 
  FaFileMedical,
  FaHandHoldingHeart,
  FaProjectDiagram,
  FaUsers,
  FaChalkboardTeacher, 
  FaHeartbeat,
  FaAward,
  FaCode, 
  FaChartLine, 
  FaGlobe, 
  FaCogs, 
  FaBrain, 
  FaDna 
} from 'react-icons/fa'

export default function ResumePage() {
  return (
    <div className={styles.resumePage}>
      <ClientNavigationWrapper />
      <main className={styles.mainContent}>
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1>Spencer Wozniak</h1>
            <NavButton to="/resume.pdf" label="Resume" className={styles.ctaButton} />
            <NavButton to="/CV.pdf" label="Curriculum Vitae" className={styles.ctaButton} />
          </div>
        </section>

        <section className={`${styles.resumeSection} ${styles.firstResumeSection}`}>
          <h2>Education</h2>
          <div className={styles.resumeItem}>
            <h3><FaGraduationCap className={styles.inlineIcon} />Michigan State University</h3>
            <p><strong>B.S. in Human Biology, Minor in Bioethics</strong> — Sep 2020 – May 2024</p>
            <p>GPA: 3.91 (Honors) &nbsp; | &nbsp; MCAT: 524</p>
          </div>
        </section>

        <section className={styles.resumeSection}>
          <h2>Clinical Experience</h2>
          <div className={styles.resumeItem}>
            <h3><FaHandsHelping className={styles.inlineIcon} />Applied Behavior Analysis Therapist </h3>
            <p><strong>Coyne and Associates | San Diego, CA</strong></p>
            <p>Aug 2024 – Present</p>
            <ul>
              <li>Conducted individualized therapy sessions to help children with autism using evidence-based ABA techniques.</li>
              <li>Implemented interventions to develop communication for nonverbal children.</li>
              <li>Taught emotional regulation techniques and supported gross motor skill development.</li>
              <li>Tracked data in EHR to analyze trends and refine treatment.</li>
              <li>Trained new ABA therapists and collaborated with leadership on protocol adherence.</li>
            </ul>
          </div>

          <div className={styles.resumeItem}>
            <h3><FaFileMedical className={styles.inlineIcon} />Medical Scribe</h3>
            <p><strong>Memorial Healthcare | Owosso, MI</strong></p>
            <p>Jul 2023 – Aug 2024</p>
            <ul>
              <li>Assisted physicians in ED and ICU by documenting exams, procedures, and orders.</li>
              <li>Reviewed labs and patient histories to support efficient decision-making.</li>
            </ul>
          </div>

          <div className={styles.resumeItem}>
            <h3><FaHandHoldingHeart className={styles.inlineIcon} />Hospital Volunteer</h3>
            <p><strong>Sparrow Hospital | Lansing, MI </strong></p>
            <p>Sep 2022 – Apr 2023</p>
            <ul>
              <li>Supported 40+ patients per shift with comfort, mobility, and companionship.</li>
              <li>Monitored vital signs and assisted with imaging and patient transport.</li>
            </ul>
          </div>
        </section>

        <section className={styles.resumeSection}>
          <h2>Research Experience</h2>
          <div className={styles.resumeItem}>
            <h3><FaProjectDiagram className={styles.inlineIcon} />Biochemistry Research Assistant</h3>
            <p><strong>Michigan State University | East Lansing, MI</strong></p>
            <p>Sep 2020 – Apr 2025</p>
            <ul>
              <li>Assisted in study startup activities and research protocol design under Dr. Michael Feig.</li>
              <li>Utilized software including Python, C++, Bash, and Excel to conduct statistical analyses, verify simulation accuracy, and refine artificial intelligence (AI) models to optimize performance.</li>
              <li>Developed AI models including convolutional and graph neural networks, and transformers.</li>
              <li>Curated and maintained large datasets to train AI algorithms for applications in biochemistry.</li>
              <li>Collaborated with interdisciplinary teams to present research findings and refine methodologies.</li>
            </ul>
            <p><strong>Publications</strong></p>
            <ul>
              <li><a href="https://doi.org/10.1021/acs.jctc.4c01682" target="_blank">Wozniak S, Janson G, Feig M. (2025). Accurate Predictions of Molecular Properties of Proteins via GNNs and Transfer Learning. <em>JCTC</em>.</a></li>
              <li><a href="https://doi.org/10.1021/acs.jpcb.4c06877" target="_blank">Wozniak S, Feig M. (2024). Diffusion and Viscosity in Mixed Protein Solutions. <em>JPCB</em>.</a></li>
            </ul>
            <p><strong>Other Projects</strong></p>
            <ul>
              <li>Molecular Dynamics Simulations of Monoclonal Antibodies (Sep 2020 - Jan 2021)</li>
              <ul>
                <li>Evaluated the stability and solubility of various monoclonal antibody candidates for treating
                cancer in physiological conditions.</li>
                <li>Found the candidates to be structurally unstable and unsuitable for therapeutic use.</li>
                <li>Presented findings to a collaborator at Florida Atlantic University.</li>
              </ul>
            </ul>
          </div>

          <div className={styles.resumeItem}>
            <h3><FaUsers className={styles.inlineIcon} />Sociology Research Assistant</h3>
            <p><strong>Michigan State University | East Lansing, MI</strong></p>
            <p>Jan 2024 – Apr 2024</p>
            <ul>
              <li>Designed and launched a research project investigating the social determinants of electronic health
              record quality, including conducting literature reviews, and compiling and analyzing complex datasets with Dr. Stephen Gasteyer.</li>
            </ul>
            <p><strong>Other Projects</strong></p>
            <ul>
              <li>The Social Determinants of EHR Quality in US Hospitals (Jan 2024 – Apr 2024)</li>
              <ul>
                <li>Compiled data from American Community Survey and American Hospital Association.</li>
                <li>Explored how social factors relate to electronic health record quality across US hospitals.</li>
                <li>Calculated odds ratios from a logistic regression to assess statistical significance.</li>
                <li>Presented a <a href="/sdoehrq.pdf" target="_blank"><strong>poster</strong></a> at 2024 University Undergraduate Research and Arts Forum at MSU.</li>
              </ul>
            </ul>
          </div>
        </section>

        <section className={styles.resumeSection}>
          <h2>Teaching Experience</h2>
          
          <div className={styles.resumeItem}>

            <h3><FaChalkboardTeacher className={styles.inlineIcon}/>Founder & Tutor</h3>

            <p><a href='https://www.wozprep.org' target='_blank'><strong>WozPrep | San Diego, CA</strong></a></p>
            <p>Nov 2024 – Present</p>
            <ul>
              <li>Founded a private tutoring service with a custom-built website and student-facing tools.</li>
              <li>Conducted 1-on-1 tutoring sessions focused on test strategy, critical thinking, and content mastery.</li>
              <li>Applied the Socratic method to foster deeper student engagement and independent problem-solving.</li>
              <li>Integrated principles of positive psychology to build student confidence and promote motivation.</li>
              <li>Created personalized study plans based on student strengths, weaknesses, and time constraints.</li>
              <li>Helped students improve scores by up to 50 percentile points.</li>
              <li>Utilized Next.js, TypeScript, and React to develop an interactive website with modern UI/UX design to
              manage client inquiries, promote services, and host content.</li>
              <li>Built a web-based portal for MCAT practice tests and question banks, featuring original questions tailored to AAMC-style reasoning and pacing.</li>
              <li>Leveraged search engine optimization to increase visibility through online outreach.</li>
            </ul>
          </div>
        </section>

        <section className={styles.resumeSection}>
          <h2>Certifications</h2>
          <div className={styles.resumeItem}>
            <h3><FaHeartbeat className={styles.inlineIcon} />Basic Life Support (BLS)</h3>
            <p><strong>American Heart Association</strong></p>
            <p><i>Issued</i> Feb 2025, <i>Expires</i> Feb 2027</p>
          </div>
        </section>

        <section className={styles.resumeSection}>
          <h2>Awards and Honors</h2>
          <div className={styles.resumeItem}>
            <h3><FaAward className={styles.inlineIcon} />Distinguished Freshman Scholarship</h3>
            <p><strong>Michigan State University Honors College</strong></p>
            <p><i>Issued</i> Sep 2020</p>
            <ul className={styles.bulletedList}>
              <li>Full-tuition academic scholarship awarded for outstanding academic achievement.</li>
            </ul>
          </div>
        </section>

        <section className={styles.resumeSection}>
          <h2>Technical Skills</h2>
          <div className={styles.skillsGrid}>
            <div className={styles.skillCard}>
              <div className={styles.skillHeader}>
                <FaCode className={styles.skillIcon} />
                <h3>Programming</h3>
              </div>
              <p>Python, JavaScript, TypeScript, C++, Bash, SQL, R</p>
            </div>

            <div className={styles.skillCard}>
              <div className={styles.skillHeader}>
                <FaChartLine className={styles.skillIcon} />
                <h3>Data Analysis</h3>
              </div>
              <p>NumPy, Pandas, SciPy, Matplotlib, Seaborn, scikit-learn, Excel</p>
            </div>

            <div className={styles.skillCard}>
              <div className={styles.skillHeader}>
                <FaGlobe className={styles.skillIcon} />
                <h3>Web Development</h3>
              </div>
              <p>HTML/CSS, React, Next.js, Flask, Vercel, Cloudflare</p>
            </div>

            <div className={styles.skillCard}>
              <div className={styles.skillHeader}>
                <FaCogs className={styles.skillIcon} />
                <h3>Tools & Platforms</h3>
              </div>
              <p>Git/GitHub, VS Code, Linux, Jupyter Notebook</p>
            </div>

            <div className={styles.skillCard}>
              <div className={styles.skillHeader}>
                <FaBrain className={styles.skillIcon} />
                <h3>AI / ML</h3>
              </div>
              <p>PyTorch, GNNs, MLPs, CNNs, MoEs, Transfer Learning, Prompt Engineering</p>
            </div>

            <div className={styles.skillCard}>
              <div className={styles.skillHeader}>
                <FaDna className={styles.skillIcon} />
                <h3>Bioinformatics</h3>
              </div>
              <p>BLAST, CHARMM, MDCONV, MMTSB, PyMol, VMD, Biopython</p>
            </div>
          </div>
        </section>


      </main>
      <Chatbot />
      <Footer />
    </div>
  );
}