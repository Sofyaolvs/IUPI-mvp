import React from 'react';

const Subjects = ({ subjects }) => {
  return (
    <div className="subjects-container">
      {subjects.map((subject) => (
        <div key={subject.id} className="subject-card">
          <div className="subject-image-container">
            <img src={subject.image} alt={subject.title} className="subject-image" />
          </div>
          <h3 className="subject-title">{subject.title}</h3>
        </div>
      ))}
    </div>
  );
};

export default Subjects;