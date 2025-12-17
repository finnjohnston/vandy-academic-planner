import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import CourseSearch from '../../components/course/CourseSearchComponent/CourseSearch';
import Plan from '../../components/plan/PlanComponent/Plan';
import CourseDetail from '../../components/course/CourseDetailComponent/CourseDetail';
import type { Course } from '../../types/Course';
import type { DragData } from '../../types/DragData';
import './Planning.css';

const API_BASE_URL = 'http://localhost:3000';

interface PlanData {
  id: number;
  name: string;
  academicYearId: number;
  academicYear: {
    id: number;
    year: string;
    start: number;
    end: number;
    isCurrent: boolean;
  };
  plannedCourses: Array<{
    id: number;
    courseId: string | null;
    semesterNumber: number;
    credits: number;
    course?: {
      subjectCode: string;
      courseNumber: string;
    } | null;
  }>;
}

const Planning: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const id = planId || '1';
        const response = await fetch(`${API_BASE_URL}/api/plans/${id}`);
        if (!response.ok) throw new Error('Failed to fetch plan data');
        const result = await response.json();
        setPlanData(result.data);
      } catch (err) {
        console.error('Error fetching plan:', err);
        setError(err instanceof Error ? err.message : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [planId]);

  const handlePlannedCourseClick = async (courseId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/courses/by-course-id/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      const data = await response.json();
      setSelectedCourse(data.data);
      setIsPopupOpen(true);
    } catch (err) {
      console.error('Error fetching course:', err);
    }
  };

  const handleDeleteCourse = async (plannedCourseId: number) => {
    if (!planData) return;

    const originalPlanData = { ...planData };
    setPlanData({
      ...planData,
      plannedCourses: planData.plannedCourses.filter(
        (pc) => pc.id !== plannedCourseId
      )
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/plans/${planData.id}/courses/${plannedCourseId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        setPlanData(originalPlanData);
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete course');
      }
    } catch (err) {
      console.error('Error deleting course:', err);
      setPlanData(originalPlanData);
      setError(err instanceof Error ? err.message : 'Failed to delete course');
    }
  };

  const handleClosePopup = () => {
    setSelectedCourse(null);
    setIsPopupOpen(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(event.active.data.current as DragData);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveDrag(null);

    if (!over || !planData) return;

    const dragData = active.data.current as DragData;
    const semesterNumber = over.data.current?.semesterNumber as number;

    // Validate semesterNumber - only proceed if it's a valid number
    if (!semesterNumber || typeof semesterNumber !== 'number') {
      return;
    }

    if (dragData.source === 'search') {
      await handleCreatePlannedCourse(dragData, semesterNumber);
    } else if (dragData.source === 'planned') {
      await handleMovePlannedCourse(dragData, semesterNumber);
    }
  };

  const handleCreatePlannedCourse = async (
    dragData: DragData,
    semesterNumber: number
  ) => {
    if (!planData) return;

    const course = dragData.course;
    const isTermSearch = dragData.searchContext?.type === 'term';

    const requestBody: { courseId?: string; classId?: string; semesterNumber: number; credits: number } = {
      [isTermSearch ? 'classId' : 'courseId']: course.courseId,
      semesterNumber,
      credits: course.creditsMin
    };

    // Optimistic update
    const tempId = -Date.now(); // Negative to distinguish from real IDs
    const tempPlannedCourse = {
      id: tempId,
      courseId: course.courseId,
      semesterNumber,
      credits: course.creditsMin,
      course: {
        subjectCode: course.subjectCode,
        courseNumber: course.courseNumber
      }
    };

    setPlanData(prev => prev ? {
      ...prev,
      plannedCourses: [...prev.plannedCourses, tempPlannedCourse]
    } : null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/plans/${planData.id}/courses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create course: ${response.status}`);
      }


      // Refetch the plan to get the updated data with proper structure
      const planResponse = await fetch(`${API_BASE_URL}/api/plans/${planData.id}`);
      if (planResponse.ok) {
        const planResult = await planResponse.json();
        setPlanData(planResult.data);
      }
    } catch (err) {
      console.error('Error creating planned course:', err);
      // Rollback on error
      setPlanData(prev => prev ? {
        ...prev,
        plannedCourses: prev.plannedCourses.filter(pc => pc.id !== tempId)
      } : null);
      setError(err instanceof Error ? err.message : 'Failed to add course');
    }
  };

  const handleMovePlannedCourse = async (
    dragData: DragData,
    newSemesterNumber: number
  ) => {
    if (!planData) return;
    if (dragData.currentSemester === newSemesterNumber) return;

    const plannedCourseId = dragData.plannedCourseId!;
    const oldSemesterNumber = dragData.currentSemester!;

    // Optimistic update
    setPlanData(prev => prev ? {
      ...prev,
      plannedCourses: prev.plannedCourses.map(pc =>
        pc.id === plannedCourseId
          ? { ...pc, semesterNumber: newSemesterNumber }
          : pc
      )
    } : null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/plans/${planData.id}/courses/${plannedCourseId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ semesterNumber: newSemesterNumber })
        }
      );

      if (!response.ok) throw new Error('Failed to move course');
    } catch (err) {
      console.error('Error moving course:', err);
      // Rollback on error
      setPlanData(prev => prev ? {
        ...prev,
        plannedCourses: prev.plannedCourses.map(pc =>
          pc.id === plannedCourseId
            ? { ...pc, semesterNumber: oldSemesterNumber }
            : pc
        )
      } : null);
      setError(err instanceof Error ? err.message : 'Failed to move course');
    }
  };

  if (loading) {
    return (
      <div className="planning-page">
        <NavBar />
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          Loading plan data...
        </div>
      </div>
    );
  }

  if (error || !planData) {
    return (
      <div className="planning-page">
        <NavBar />
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
          Error: {error || 'No plan data available'}
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="planning-page">
        <NavBar isBlurred={isPopupOpen} />
        <CourseSearch
          onPopupOpen={() => setIsPopupOpen(true)}
          onPopupClose={() => setIsPopupOpen(false)}
          isBlurred={isPopupOpen}
        />
        <Plan
          planId={planData.id}
          planName={planData.name}
          academicYear={planData.academicYear}
          plannedCourses={planData.plannedCourses}
          isBlurred={isPopupOpen}
          onCourseDetailsClick={handlePlannedCourseClick}
          onDeleteCourseClick={handleDeleteCourse}
        />

        {selectedCourse && ReactDOM.createPortal(
          <CourseDetail course={selectedCourse} onClose={handleClosePopup} />,
          document.body
        )}
      </div>

      <DragOverlay>
        {activeDrag && (
          activeDrag.source === 'search' ? (
            // CourseCard preview - match CourseCard structure exactly
            <div className="course" style={{ opacity: 0.25 }}>
              <span className="course-code">
                {activeDrag.course.subjectCode || ''} {activeDrag.course.courseNumber || ''}
              </span>
              <span className="course-title">
                {activeDrag.course.title && activeDrag.course.title.length > 40
                  ? activeDrag.course.title.substring(0, 40) + '...'
                  : (activeDrag.course.title || '')}
              </span>
              <span className="course-credits">
                {activeDrag.course.creditsMin === activeDrag.course.creditsMax
                  ? activeDrag.course.creditsMin
                  : `${activeDrag.course.creditsMin} - ${activeDrag.course.creditsMax}`}
              </span>
            </div>
          ) : (
            // PlannedCourse preview - keep existing drag-preview structure
            <div className="drag-preview">
              <span className="drag-preview-code">
                {activeDrag.course.subjectCode || ''} {activeDrag.course.courseNumber || ''}
              </span>
              {activeDrag.course.title && (
                <span className="drag-preview-title">
                  {activeDrag.course.title.length > 40
                    ? activeDrag.course.title.substring(0, 40) + '...'
                    : activeDrag.course.title}
                </span>
              )}
              <span className="drag-preview-credits">
                {activeDrag.course.creditsMin}
              </span>
            </div>
          )
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default Planning;
