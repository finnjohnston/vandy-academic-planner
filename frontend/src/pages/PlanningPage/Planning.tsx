import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import CourseSearch from '../../components/course/CourseSearchComponent/CourseSearch';
import Plan from '../../components/plan/PlanComponent/Plan';
import Requirement from '../../components/requirements/RequirementComponent/Requirement';
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
  const [dragOverPosition, setDragOverPosition] = useState<{
    semesterNumber: number;
    position: number;
    indicatorPosition: 'above' | 'below';
    isLastInSemester: boolean;
    isSwapMode?: boolean;
    hoveredPlannedCourseId?: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
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

    // Hovering over a planned course - show gap on hovered course
    if (overData?.source === 'planned') {
      const hoveredPosition = overData.currentPosition;
      const activeSemester = dragData.currentSemester;
      const isSameSemester = activeSemester === overData.currentSemester;

      // Determine where the gap should appear (above or below the hovered course)
      // For all moves: always show gap above (insert before hovered course)
      // This allows inserting at any position in the list
      const indicatorPosition: 'above' | 'below' = 'above';

      // Calculate if this is the last position in the semester
      const semesterCourses = planData?.plannedCourses.filter(
        pc => pc.semesterNumber === overData.currentSemester && pc.id > 0
      ) || [];
      const maxPosition = Math.max(...semesterCourses.map(pc => pc.position), -1);
      const isLastInSemester = hoveredPosition === maxPosition;

      // Check if semester has 7 courses (excluding the dragged course if same semester)
      // For same-semester drags, we're moving a course that's already in the semester,
      // so we subtract 1 from the count. For cross-semester/search drags, we count all courses.
      const targetSemesterCourseCount = isSameSemester
        ? semesterCourses.length - 1  // Exclude the dragged course
        : semesterCourses.length;     // Count all courses (we're adding a new one)
      const isSwapMode = targetSemesterCourseCount >= 7;

      // Store the HOVERED position (not insertion position) along with the indicator direction
      setDragOverPosition({
        semesterNumber: overData.currentSemester,
        position: hoveredPosition,
        indicatorPosition,
        isLastInSemester,
        isSwapMode,
        hoveredPlannedCourseId: overData.plannedCourseId
      });

      // DEBUG LOGGING
      console.log('=== DRAG OVER ===', {
        activePosition: dragData.currentPosition,
        hoveredPosition,
        activeSemester,
        hoveredSemester: overData.currentSemester,
        isSameSemester,
        indicatorPosition,
        draggedCourseId: dragData.plannedCourseId,
        hoveredCourseId: overData.plannedCourseId
      });
    }
    // Hovering over semester body - append to end
    else if (overData?.semesterNumber !== undefined) {
      // Filter courses in target semester, excluding:
      // 1. The course being dragged if it's in the same semester
      // 2. Temporary courses from optimistic updates (negative IDs)
      const semesterCourses = planData?.plannedCourses.filter(
        pc => pc.semesterNumber === overData.semesterNumber &&
              pc.id > 0 && // Exclude temp courses (negative IDs from optimistic updates)
              !(dragData.source === 'planned' &&
                dragData.plannedCourseId === pc.id &&
                dragData.currentSemester === overData.semesterNumber)
      ) || [];

      const isSameSemesterDrag =
        dragData.source === 'planned' &&
        dragData.currentSemester === overData.semesterNumber;

      // If semester has 7 courses and dragging from outside, disallow append (only swap allowed)
      if (!isSameSemesterDrag && semesterCourses.length >= 7) {
        setDragOverPosition(null);
        return;
      }

      // Use max position + 1 to ensure append position doesn't match any existing course
      const maxPosition = Math.max(...semesterCourses.map(pc => pc.position), -1);
      const appendPosition = maxPosition + 1;

      setDragOverPosition({
        semesterNumber: overData.semesterNumber,
        position: appendPosition,
        indicatorPosition: 'above',
        isLastInSemester: true // Appending is always at the end
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
    const hoveredPosition = targetPosition.position;
    const indicatorDirection = targetPosition.indicatorPosition;

    if (!semesterNumber || typeof semesterNumber !== 'number') {
      return;
    }

    // Calculate actual insertion position from hovered position and indicator direction
    const activeSemester = dragData.currentSemester;
    const isSameSemester = activeSemester === semesterNumber;
    const activePosition = dragData.currentPosition;

    // DEBUG LOGGING
    console.log('=== DRAG END (pre-calc) ===', {
      activePosition,
      hoveredPosition,
      indicatorDirection,
      isSameSemester,
      oldSemester: dragData.currentSemester,
      newSemester: semesterNumber
    });

    let insertPosition: number;

    // In swap mode, insert at the exact position of the deleted course
    if (targetPosition.isSwapMode) {
      insertPosition = hoveredPosition;
    } else {
      // Normal insertion logic
      // Get the current count of courses in the target semester
      const targetSemesterCourses = planData?.plannedCourses.filter(
        pc => pc.semesterNumber === semesterNumber && pc.id > 0
      ) || [];

      // For same-semester moves, we remove one course first, so max position is count - 1
      // For cross-semester/search, we're adding a course, so max position is count
      const maxPosition = isSameSemester ? targetSemesterCourses.length - 1 : targetSemesterCourses.length;

      // Since we always use 'above' indicator, we always insert before the hovered course
      if (isSameSemester && activePosition !== undefined && activePosition < hoveredPosition) {
        // Same-semester, dragging downward: course will be removed first, shifting positions down
        const isLastPosition = targetPosition.isLastInSemester;
        const isAdjacentToLast = isLastPosition && hoveredPosition === activePosition + 1;

        if (isAdjacentToLast) {
          // Special case: dragging from N to N+1 where N+1 is last position
          // Swap adjacent courses: insert after the last course
          insertPosition = hoveredPosition;
        } else {
          // Normal downward drag: the hovered course will be at (hoveredPosition - 1) after removal
          insertPosition = hoveredPosition - 1;
        }
      } else {
        // Cross-semester OR same-semester dragging upward: insert before hovered position
        insertPosition = hoveredPosition;
      }

      // Ensure position doesn't exceed valid range
      insertPosition = Math.min(insertPosition, maxPosition);
    }

    // DEBUG LOGGING
    console.log('=== DRAG END (post-calc) ===', {
      calculatedInsertPosition: insertPosition,
      isSwapMode: targetPosition.isSwapMode,
      hoveredPlannedCourseId: targetPosition.hoveredPlannedCourseId
    });

    // Handle swap mode: delete the hovered course before inserting
    if (targetPosition.isSwapMode && targetPosition.hoveredPlannedCourseId) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/plans/${planData.id}/courses/${targetPosition.hoveredPlannedCourseId}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          throw new Error('Failed to delete course in swap');
        }

        // Remove from local state
        setPlanData({
          ...planData,
          plannedCourses: planData.plannedCourses.filter(
            pc => pc.id !== targetPosition.hoveredPlannedCourseId
          )
        });
      } catch (err) {
        console.error('Error deleting course in swap:', err);
        return; // Abort the swap if deletion fails
      }
    }

    if (dragData.source === 'search') {
      await handleCreatePlannedCourse(dragData, semesterNumber, insertPosition);
    } else if (dragData.source === 'planned') {
      await handleMovePlannedCourse(dragData, semesterNumber, insertPosition);
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

    // Optimistic update with fractional position to avoid sort conflicts
    // For same-semester moves, use .5 offset to ensure correct visual ordering:
    // - Downward drags: add 0.5 to appear after courses at newPosition
    // - Upward drags: subtract 0.5 to appear before courses at newPosition
    const optimisticPosition = newSemesterNumber === oldSemesterNumber
      ? (oldPosition < newPosition ? newPosition + 0.5 : newPosition - 0.5)
      : newPosition;

    setPlanData(prev => prev ? {
      ...prev,
      plannedCourses: prev.plannedCourses.map(pc =>
        pc.id === plannedCourseId
          ? { ...pc, semesterNumber: newSemesterNumber, position: optimisticPosition }
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
        <div className="plan-requirements-container">
          <Plan
            planId={planData.id}
            planName={planData.name}
            academicYear={planData.academicYear}
            plannedCourses={planData.plannedCourses}
            isBlurred={isPopupOpen}
            onCourseDetailsClick={handlePlannedCourseClick}
            onDeleteCourseClick={handleDeleteCourse}
            dragOverPosition={dragOverPosition}
            activeDrag={activeDrag}
          />
          <Requirement isBlurred={isPopupOpen} />
        </div>

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
