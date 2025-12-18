import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
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
    position: number;
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
  const [dragOverPosition, setDragOverPosition] = useState<{ semesterNumber: number; position: number } | null>(null);

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

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;
    if (!over) {
      setDragOverPosition(null);
      return;
    }

    const overData = over.data.current;
    const dragData = active.data.current as DragData;

    // Hovering over a planned course - insert at that position
    if (overData?.source === 'planned') {
      const hoveredPosition = overData.currentPosition;
      const activePosition = dragData.currentPosition;
      const activeSemester = dragData.currentSemester;

      let insertPosition: number;

      // For cross-semester moves, insert at the hovered position (before the hovered course)
      if (activeSemester !== overData.currentSemester) {
        insertPosition = hoveredPosition;
      }
      // For same-semester moves, adjust based on drag direction
      else {
        // If dragging from above (lower position), insert at hoveredPosition - 1 ("above" indicator)
        // If dragging from below (higher position), insert at hoveredPosition + 1 ("below" indicator)
        insertPosition =
          activePosition !== undefined && activePosition < hoveredPosition
            ? hoveredPosition - 1  // Insert "above" (before the hovered course)
            : hoveredPosition + 1;  // Insert "below" (after the hovered position)
      }

      setDragOverPosition({
        semesterNumber: overData.currentSemester,
        position: insertPosition
      });
    }
    // Hovering over semester body - append to end
    else if (overData?.semesterNumber !== undefined) {
      // Filter courses in target semester, excluding the one being dragged if it's in the same semester
      const semesterCourses = planData?.plannedCourses.filter(
        pc => pc.semesterNumber === overData.semesterNumber &&
              !(dragData.source === 'planned' &&
                dragData.plannedCourseId === pc.id &&
                dragData.currentSemester === overData.semesterNumber)
      ) || [];

      // Calculate max position, filtering out undefined values and using course count as fallback
      const positions = semesterCourses
        .map(pc => pc.position)
        .filter((pos): pos is number => typeof pos === 'number' && !isNaN(pos));

      const maxPosition = positions.length > 0
        ? Math.max(...positions)
        : -1;

      setDragOverPosition({
        semesterNumber: overData.semesterNumber,
        position: maxPosition + 1
      });
    }
    else {
      setDragOverPosition(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);
    const targetPosition = dragOverPosition;
    setDragOverPosition(null);

    if (!over || !planData || !targetPosition) return;

    const dragData = active.data.current as DragData;
    const semesterNumber = targetPosition.semesterNumber;
    const position = targetPosition.position;

    if (!semesterNumber || typeof semesterNumber !== 'number') {
      return;
    }

    if (dragData.source === 'search') {
      await handleCreatePlannedCourse(dragData, semesterNumber, position);
    } else if (dragData.source === 'planned') {
      await handleMovePlannedCourse(dragData, semesterNumber, position);
    }
  };

  const handleCreatePlannedCourse = async (
    dragData: DragData,
    semesterNumber: number,
    position: number
  ) => {
    if (!planData) return;

    const course = dragData.course;
    const isTermSearch = dragData.searchContext?.type === 'term';

    const requestBody: { courseId?: string; classId?: string; semesterNumber: number; credits: number; position: number } = {
      [isTermSearch ? 'classId' : 'courseId']: course.courseId,
      semesterNumber,
      credits: course.creditsMin,
      position
    };

    // Optimistic update
    const tempId = -Date.now(); // Negative to distinguish from real IDs
    const tempPlannedCourse = {
      id: tempId,
      courseId: course.courseId,
      semesterNumber,
      position,
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
    newSemesterNumber: number,
    newPosition: number
  ) => {
    if (!planData) return;

    // Skip if both semester and position are the same
    if (dragData.currentSemester === newSemesterNumber && dragData.currentPosition === newPosition) {
      return;
    }

    const plannedCourseId = dragData.plannedCourseId!;
    const oldSemesterNumber = dragData.currentSemester!;
    const oldPosition = dragData.currentPosition!;

    // Optimistic update
    setPlanData(prev => prev ? {
      ...prev,
      plannedCourses: prev.plannedCourses.map(pc =>
        pc.id === plannedCourseId
          ? { ...pc, semesterNumber: newSemesterNumber, position: newPosition }
          : pc
      )
    } : null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/plans/${planData.id}/courses/${plannedCourseId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ semesterNumber: newSemesterNumber, position: newPosition })
        }
      );

      if (!response.ok) throw new Error('Failed to move course');

      // Refetch the plan to get correct positions for all courses
      const planResponse = await fetch(`${API_BASE_URL}/api/plans/${planData.id}`);
      if (planResponse.ok) {
        const planResult = await planResponse.json();
        setPlanData(planResult.data);
      }
    } catch (err) {
      console.error('Error moving course:', err);
      // Rollback on error
      setPlanData(prev => prev ? {
        ...prev,
        plannedCourses: prev.plannedCourses.map(pc =>
          pc.id === plannedCourseId
            ? { ...pc, semesterNumber: oldSemesterNumber, position: oldPosition }
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
      onDragOver={handleDragOver}
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

      <DragOverlay dropAnimation={null}>
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
