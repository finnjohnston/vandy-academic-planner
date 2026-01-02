import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import ReturnToPlanButton from '../../components/program/programpage/ReturnToPlanButtonComponent/ReturnToPlanButton';
import AddCreditsButton from '../../components/transfercredits/AddCreditsButtonComponent/AddCreditsButton';
import TransferSearchToggle from '../../components/transfercredits/TransferSearchToggleComponent/TransferSearchToggle';
import TransferCreditsTableHeader from '../../components/transfercredits/TransferCreditsTableHeaderComponent/TransferCreditsTableHeader';
import TransferCourseList from '../../components/transfercredits/TransferCourseListComponent/TransferCourseList';
import CourseSearch from '../../components/course/CourseSearchComponent/CourseSearch';
import { PlanProvider } from '../../contexts/PlanContext';
import type { Plan } from '../../types/Plan';
import type { PlannedCourse } from '../../types/PlannedCourse';
import type { DragData } from '../../types/DragData';
import './TransferCredits.css';

const API_BASE_URL = 'http://localhost:3000';

const TransferCredits: React.FC = () => {
  const { planId } = useParams<{ planId?: string }>();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [transferCourses, setTransferCourses] = useState<PlannedCourse[]>([]);
  const [allPlannedCourses, setAllPlannedCourses] = useState<PlannedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [dragOverTransfer, setDragOverTransfer] = useState<boolean>(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    })
  );

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  const openSearch = () => {
    setIsSearchOpen(true);
  };

  const handleDeleteCourse = async (plannedCourseId: number) => {
    if (!planId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/plans/${planId}/courses/${plannedCourseId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete transfer course');
      }

      // Update local state by removing the deleted course
      setTransferCourses(prevCourses =>
        prevCourses.filter(course => course.id !== plannedCourseId)
      );
      setAllPlannedCourses(prevCourses =>
        prevCourses.filter(course => course.id !== plannedCourseId)
      );
    } catch (err) {
      console.error('Error deleting transfer course:', err);
      alert('Failed to delete transfer course. Please try again.');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(event.active.data.current as DragData);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;
    const dragData = active.data.current as DragData;

    // Only allow drops from search source
    if (dragData?.source !== 'search') {
      setDragOverTransfer(false);
      return;
    }

    if (over?.id === 'transfer-credits-drop-zone') {
      setDragOverTransfer(true);
    } else {
      setDragOverTransfer(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);
    setDragOverTransfer(false);

    if (!over || !planId) return;

    const dragData = active.data.current as DragData;

    // Only handle drops from search on transfer drop zone
    if (dragData?.source === 'search' && over.id === 'transfer-credits-drop-zone') {
      await handleCreateTransferCourse(dragData);
    }
  };

  const handleCreateTransferCourse = async (dragData: DragData) => {
    if (!planId) return;

    const course = dragData.course;
    const isTermSearch = dragData.searchContext?.type === 'term';

    const requestBody = {
      [isTermSearch ? 'classId' : 'courseId']: course.courseId,
      semesterNumber: 0,
      credits: course.creditsMin,
      position: 0
    };

    // Optimistic update
    const tempId = -Date.now();
    const tempTransferCourse: PlannedCourse = {
      id: tempId,
      planId: parseInt(planId),
      courseId: course.courseId,
      semesterNumber: 0,
      position: 0,
      credits: course.creditsMin,
      subjectCode: course.subjectCode,
      courseNumber: course.courseNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTransferCourses(prev => [...prev, tempTransferCourse]);
    setAllPlannedCourses(prev => [...prev, tempTransferCourse]);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/plans/${planId}/courses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create transfer course');
      }

      // Refetch transfer courses
      const transferResponse = await fetch(
        `${API_BASE_URL}/api/plans/${planId}/courses?semesterNumber=0`
      );
      if (transferResponse.ok) {
        const transferData = await transferResponse.json();
        // Sort by ID to ensure new courses appear at the bottom
        const sortedCourses = transferData.data.sort((a: any, b: any) => a.id - b.id);
        setTransferCourses(sortedCourses);
      }

      // Refetch all courses for PlanContext
      const allCoursesResponse = await fetch(
        `${API_BASE_URL}/api/plans/${planId}/courses`
      );
      if (allCoursesResponse.ok) {
        const allCoursesData = await allCoursesResponse.json();
        setAllPlannedCourses(allCoursesData.data);
      }
    } catch (err) {
      console.error('Error creating transfer course:', err);
      // Rollback optimistic update
      setTransferCourses(prev => prev.filter(c => c.id !== tempId));
      setAllPlannedCourses(prev => prev.filter(c => c.id !== tempId));
      alert('Failed to add transfer course. Please try again.');
    }
  };

  // Fetch plan and transfer courses
  useEffect(() => {
    if (!planId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch plan, all planned courses, and transfer courses in parallel
        const [planResponse, allCoursesResponse, transferCoursesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/plans/${planId}`),
          fetch(`${API_BASE_URL}/api/plans/${planId}/courses`),
          fetch(`${API_BASE_URL}/api/plans/${planId}/courses?semesterNumber=0`)
        ]);

        if (!planResponse.ok) throw new Error('Failed to fetch plan');
        if (!allCoursesResponse.ok) throw new Error('Failed to fetch planned courses');
        if (!transferCoursesResponse.ok) throw new Error('Failed to fetch transfer courses');

        const planData = await planResponse.json();
        const allCoursesData = await allCoursesResponse.json();
        const transferCoursesData = await transferCoursesResponse.json();

        setPlan(planData.data);
        setAllPlannedCourses(allCoursesData.data);
        // Sort by ID to ensure new courses appear at the bottom
        const sortedTransferCourses = transferCoursesData.data.sort((a: any, b: any) => a.id - b.id);
        setTransferCourses(sortedTransferCourses);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [planId]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <PlanProvider value={allPlannedCourses}>
        <div className="transfer-credits-page">
          <NavBar />
          {isSearchOpen && plan && (
            <CourseSearch
              hideFilters={true}
              fixedAcademicYearId={plan.academicYearId}
            />
          )}
          <div className={`transfer-credits-search-wrapper${isSearchOpen ? ' transfer-credits-search-wrapper-shifted' : ''}`}>
            <TransferSearchToggle onClick={toggleSearch} />
          </div>
          <div className={`transfer-credits-content${isSearchOpen ? ' transfer-credits-content-shifted' : ''}`}>
            <div className="transfer-credits-header">
              <h1>Transfer credits</h1>
              <div className="transfer-credits-header-buttons">
                <AddCreditsButton onClick={openSearch} />
                <ReturnToPlanButton planId={planId ? parseInt(planId) : undefined} />
              </div>
            </div>
            <div className={`transfer-credits-drop-zone-wrapper${dragOverTransfer && activeDrag?.source === 'search' ? ' transfer-credits-drop-zone-active' : ''}`}>
              <TransferCreditsTableHeader />
              <TransferCourseList
                courses={transferCourses}
                loading={loading}
                error={error}
                onDeleteCourse={handleDeleteCourse}
                isDropTarget={dragOverTransfer}
                isDragging={activeDrag !== null && activeDrag.source === 'search'}
              />
            </div>
          </div>
        </div>
      </PlanProvider>

      <DragOverlay dropAnimation={null}>
        {activeDrag && activeDrag.source === 'search' && (
          <div className="course" style={{ opacity: 0.25 }}>
            <span className="course-code">
              {activeDrag.course.subjectCode} {activeDrag.course.courseNumber}
            </span>
            <span className="course-title">
              {activeDrag.course.title && activeDrag.course.title.length > 40
                ? activeDrag.course.title.substring(0, 40) + '...'
                : activeDrag.course.title}
            </span>
            <span className="course-credits">
              {activeDrag.course.creditsMin === activeDrag.course.creditsMax
                ? activeDrag.course.creditsMin
                : `${activeDrag.course.creditsMin} - ${activeDrag.course.creditsMax}`}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default TransferCredits;
