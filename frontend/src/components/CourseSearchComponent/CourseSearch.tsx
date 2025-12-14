import React, { useState, useEffect, useCallback } from 'react';
import './CourseSearch.css';
import SearchBar from '../SearchBarComponent/SearchBar';
import Dropdown from '../DropdownComponent/Dropdown';
import CourseList from '../CourseListComponent/CourseList';
import CourseDetail from '../CourseDetailComponent/CourseDetail';
import type { Course } from '../../types/Course';

interface AcademicYear {
  id: number;
  year: string;
  start: number;
  end: number;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Term {
  id: number;
  termId: string;
  academicYearId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = 'http://localhost:3000';

interface CourseSearchProps {
  onPopupOpen?: () => void;
  onPopupClose?: () => void;
}

const CourseSearch: React.FC<CourseSearchProps> = ({ onPopupOpen, onPopupClose }) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(false);

  // Data states
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  // Selection states
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<AcademicYear | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>('Year');

  // Loading and error states
  const [isLoadingYears, setIsLoadingYears] = useState<boolean>(true);
  const [isLoadingTerms, setIsLoadingTerms] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Popup state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Fetch academic years on component mount
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        setIsLoadingYears(true);

        // Fetch all academic years
        const yearsResponse = await fetch(`${API_BASE_URL}/api/academic-years`);
        if (!yearsResponse.ok) throw new Error('Failed to fetch academic years');
        const yearsData = await yearsResponse.json();

        if (!yearsData.data || yearsData.data.length === 0) {
          setError('No academic years available');
          setAcademicYears([]);
          setSelectedAcademicYear(null);
          return;
        }

        setAcademicYears(yearsData.data);

        // Try to fetch current year
        try {
          const currentResponse = await fetch(`${API_BASE_URL}/api/academic-years/current`);
          if (currentResponse.ok) {
            const currentData = await currentResponse.json();
            const currentYear = yearsData.data.find(
              (year: AcademicYear) => year.id === currentData.data.id
            );
            setSelectedAcademicYear(currentYear || yearsData.data[0]);
          } else {
            // No current year set, default to first (most recent)
            setSelectedAcademicYear(yearsData.data[0]);
          }
        } catch {
          // If current endpoint fails, fall back to first year
          setSelectedAcademicYear(yearsData.data[0]);
        }

        setError(null);
      } catch (err) {
        setError('Failed to load academic years');
        console.error('Error fetching academic years:', err);
      } finally {
        setIsLoadingYears(false);
      }
    };

    fetchAcademicYears();
  }, []);

  // Fetch terms when academic year changes
  useEffect(() => {
    if (!selectedAcademicYear) return;

    const fetchTerms = async () => {
      try {
        setIsLoadingTerms(true);
        const response = await fetch(
          `${API_BASE_URL}/api/terms?academicYearId=${selectedAcademicYear.id}`
        );
        if (!response.ok) throw new Error('Failed to fetch terms');
        const data = await response.json();
        setTerms(data.data || []);

        // Reset term selection to "Year" when academic year changes
        setSelectedTerm('Year');
      } catch (err) {
        console.error('Error fetching terms:', err);
        setTerms([]);
      } finally {
        setIsLoadingTerms(false);
      }
    };

    fetchTerms();
  }, [selectedAcademicYear]);

  const handleAcademicYearChange = (yearString: string) => {
    const year = academicYears.find((y) => y.year === yearString);
    if (year) {
      setSelectedAcademicYear(year);
    }
  };

  const handleSearch = useCallback(async () => {
    // Don't search if no academic year selected or query is empty
    if (!selectedAcademicYear || !searchQuery.trim()) {
      setCourses([]);
      return;
    }

    setIsLoadingCourses(true);

    try {
      let url: string;
      let params: URLSearchParams;

      if (selectedTerm === 'Year') {
        // Search courses by academic year
        params = new URLSearchParams({
          academicYearId: selectedAcademicYear.id.toString(),
          q: searchQuery.trim()
        });
        url = `${API_BASE_URL}/api/courses?${params}`;
      } else {
        // Search classes by term
        const selectedTermObj = terms.find(t => t.name === selectedTerm);
        if (!selectedTermObj) return;

        params = new URLSearchParams({
          termId: selectedTermObj.termId,
          q: searchQuery.trim()
        });
        url = `${API_BASE_URL}/api/classes?${params}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setCourses(data.data || []);
    } catch (err) {
      console.error('Error fetching courses/classes:', err);
      setCourses([]);
    } finally {
      setIsLoadingCourses(false);
    }
  }, [selectedAcademicYear, searchQuery, selectedTerm, terms]);

  // Re-run search when academic year or term changes (if user has searched)
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAcademicYear, selectedTerm]);

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    onPopupOpen?.();
  };

  const handleClosePopup = () => {
    setSelectedCourse(null);
    onPopupClose?.();
  };

  return (
    <div className="course-search">
      <div className="course-search-header">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          placeholder="Search courses..."
        />

        {error && <div className="error-message">{error}</div>}

        <div className="dropdowns-container">
          <Dropdown
            label="Academic Year"
            value={selectedAcademicYear?.year || 'Loading...'}
            options={academicYears.map((year) => year.year)}
            onChange={handleAcademicYearChange}
            disabled={isLoadingYears || academicYears.length === 0}
            className="year-dropdown"
          />

          <Dropdown
            label="Term"
            value={selectedTerm}
            options={['Year', ...terms.map((term) => term.name)]}
            onChange={setSelectedTerm}
            disabled={isLoadingTerms || !selectedAcademicYear}
            className="term-dropdown"
          />
        </div>
      </div>

      {isLoadingCourses ? (
        <div className="loading-message">Loading...</div>
      ) : (
        <CourseList
          courses={courses}
          onCourseClick={handleCourseClick}
        />
      )}

      {selectedCourse && (
        <CourseDetail
          course={selectedCourse}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
};

export default CourseSearch;
