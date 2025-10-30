// Department operations
export {
  getDepartments,
  createDepartment,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentCourseCount,
  getDepartmentStudentCount,
  getDepartmentsWithCounts,
  getAllDepartmentCodes,
} from "./data/departments";

// Student operations
export {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  promoteStudentsToNextSemester,
  takeStudentsDownSemester,
  getStudentFilterOptions,
} from "./data/students";

// Course operations
export {
  getCourses,
  getCoursesByDepartment,
  createCourse,
  deleteCourse,
  getCourseById,
  updateCourse,
  getCourseStudentCount,
  getCoursesWithStudentCounts,
  getAllCourseYears,
  getAllCourseSemesters,
} from "./data/courses";

// Registration operations
export {
  getStudentRegistrations,
  getAvailableCoursesForStudent,
  registerStudentForCourse,
  unregisterStudentFromCourse,
  isStudentRegisteredForCourse,
  getRegisteredCoursesForStudent,
  getCoursesAvailableForResultEntry,
  canUnregisterStudentFromCourse,
} from "./data/registrations";

// Result operations
export {
  getStudentResults,
  getStudentResultsWithBacklog,
  getEffectiveStudentResults,
  getResults,
  canAddBacklogResult,
  createResult,
  getResultById,
  updateResult,
  deleteResult,
  getStudentCGPA,
  getResultsFilterOptions,
} from "./data/results";

// Analytics and statistics
export {
  getStudentPassedExamsCount,
  getStudentPublishedResultsCount,
  getStudentTotalCredits,
  getAdminStats,
} from "./data/analytics";

// Backlog operations
export {
  createBacklogGroup,
  addToBacklogGroup,
  removeFromBacklogGroup,
  getBacklogGroups,
  getBacklogGroupById,
  updateBacklogGroup,
  deleteBacklogGroup,
  getAvailableBacklogCoursesForStudent,
  getAvailableBacklogGroupsForStudentCourse,
  isStudentCourseRegisteredInBacklogGroup,
  registerStudentForBacklogCourse,
  unregisterStudentFromBacklogCourse,
  openBacklogGroup,
  closeBacklogGroup,
  getBacklogGroupStats,
} from "./data/backlog";
