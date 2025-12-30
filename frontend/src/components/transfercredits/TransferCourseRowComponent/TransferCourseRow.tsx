import React from 'react';
import deleteIcon from '../../../assets/delete_icon.png';
import detailsIcon from '../../../assets/details_icon.png';
import './TransferCourseRow.css';

interface TransferCourseRowProps {
  course: string;
  title: string;
  credits: number;
  isLast?: boolean;
  onDetailsClick?: () => void;
  onDeleteClick?: () => void;
}

const TransferCourseRow: React.FC<TransferCourseRowProps> = ({
  course,
  title,
  credits,
  isLast = false,
  onDetailsClick,
  onDeleteClick
}) => {
  return (
    <div className={`transfer-course-row${isLast ? ' transfer-course-row-last' : ''}`}>
      <span className="transfer-course-row-course">{course}</span>
      <span className="transfer-course-row-title">{title}</span>
      <span className="transfer-course-row-credits">{credits}</span>
      <button className="transfer-course-row-details-button" onClick={onDetailsClick}>
        <img src={detailsIcon} alt="Details" className="transfer-course-row-details-icon" />
      </button>
      <button className="transfer-course-row-delete-button" onClick={onDeleteClick}>
        <img src={deleteIcon} alt="Delete" className="transfer-course-row-delete-icon" />
      </button>
    </div>
  );
};

export default TransferCourseRow;
