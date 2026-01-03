import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Pagination = ({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  onPageChange 
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="admin-pagination">
      <div className="pagination-info">
        Showing <strong>{startItem}-{endItem}</strong> of <strong>{totalItems}</strong> entries
      </div>
      <div className="pagination-controls">
        <button 
          className="med-btn med-btn-secondary med-btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <FaChevronLeft /> Prev
        </button>
        <button 
          className="med-btn med-btn-secondary med-btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next <FaChevronRight />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
