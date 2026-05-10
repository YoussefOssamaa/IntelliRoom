import { useEffect, useState } from 'react';
import Navigation from '../../components/common/Navigation';
import Footer from '../../components/common/Footer';
import { getTeamMembers } from '../../services/teamService';
import './AboutPage.css';

const AboutPage = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let ignore = false;

    getTeamMembers()
      .then((members) => {
        if (!ignore) {
          setTeamMembers(members);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!ignore) {
          setStatus('error');
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="about-page">
      <Navigation progress={0} />
      <main className="about-main">
        <section className="about-heading">
          <span className="about-kicker">IntelliRoom</span>
          <h1 className="about-title">Meet the Team</h1>
          <p className="about-copy">
            The team behind IntelliRoom brings together AI, frontend, backend, and design systems work to build a smarter interior design platform.
          </p>
        </section>

        {status === 'loading' && <p className="team-state">Loading team...</p>}
        {status === 'error' && <p className="team-state">Unable to load team members.</p>}

        {status === 'ready' && (
          <section className="team-grid" aria-label="Team members">
            {teamMembers.map((member) => (
              <article className="team-card" key={member.email}>
                <div className="team-photo-wrap">
                  <img className="team-photo" src={member.photoUrl} alt={member.name} />
                </div>
                <div className="team-info">
                  <h2 className="team-name">{member.name}</h2>
                  <a className="team-email" href={`mailto:${member.email}`}>
                    {member.email}
                  </a>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
