get_filename_component(PACKAGE_PREFIX_DIR "${CMAKE_CURRENT_LIST_DIR}" ABSOLUTE)

set(GLM_FOUND 1)
set(GLM_INCLUDE_DIRS "${PACKAGE_PREFIX_DIR}/include")
set(GLM_ROOT_DIR     "${PACKAGE_PREFIX_DIR}")

SET(GLM_VERSION_STRING "0.9.9")
SET(GLM_VERSION_MAJOR "0")
SET(GLM_VERSION_MINOR "9")
SET(GLM_VERSION_PATCH "9")
