import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import './Categories.css';

const CATEGORIES = [
  { tag: 'nlp', label: 'Natural Language Processing', desc: 'Text, language, and conversation datasets', count: 2841, color: '#60a5fa', icon: 'Aa' },
  { tag: 'cv', label: 'Computer Vision', desc: 'Images, video, and visual recognition data', count: 1923, color: '#fbbf24', icon: 'Eye' },
  { tag: 'tabular', label: 'Tabular Data', desc: 'Structured datasets for classification and regression', count: 1456, color: '#4ade80', icon: '#' },
  { tag: 'audio', label: 'Audio & Speech', desc: 'Voice, music, and sound event data', count: 892, color: '#ff007f', icon: '~' },
  { tag: 'medical', label: 'Medical & Healthcare', desc: 'Clinical, radiology, and genomics data', count: 634, color: '#f87171', icon: '+' },
  { tag: 'code', label: 'Source Code', desc: 'Code repositories, bugs, and program analysis', count: 1102, color: '#8B5CF6', icon: '</>' },
  { tag: 'financial', label: 'Finance & Markets', desc: 'Trading, risk, and economic indicator data', count: 756, color: '#fbbf24', icon: '$' },
  { tag: 'multimodal', label: 'Multimodal', desc: 'Mixed-format datasets across modalities', count: 445, color: '#00E5FF', icon: '*' },
  { tag: 'robotics', label: 'Robotics', desc: 'Simulation, manipulation, and navigation data', count: 234, color: '#a78bfa', icon: 'R' },
  { tag: 'satellite', label: 'Satellite & Geo', desc: 'Earth observation and geospatial datasets', count: 178, color: '#34d399', icon: 'G' },
  { tag: 'synthetic', label: 'Synthetic Data', desc: 'AI-generated training and validation data', count: 512, color: '#f472b6', icon: 'S' },
  { tag: 'gaming', label: 'Gaming', desc: 'Game states, player behavior, and environments', count: 301, color: '#c084fc', icon: 'P' },
];

export default function Categories() {
  return (
    <div className="categories-page">
      <div className="container">
        <div className="categories-header">
          <div className="section-label">Explore</div>
          <h1 className="categories-title">Categories</h1>
          <p className="categories-sub">Discover datasets organized by AI domain and data type.</p>
        </div>
        <div className="categories-grid">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.tag}
              to={`/browse?tags=${cat.tag}`}
              className="categories-card"
            >
              <div className="categories-card-icon" style={{ color: cat.color, borderColor: `${cat.color}22` }}>
                {cat.icon}
              </div>
              <div className="categories-card-body">
                <h3 className="categories-card-label">{cat.label}</h3>
                <p className="categories-card-desc">{cat.desc}</p>
                <span className="categories-card-count">{cat.count.toLocaleString()} datasets</span>
              </div>
              <ArrowRight size={16} className="categories-card-arrow" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
