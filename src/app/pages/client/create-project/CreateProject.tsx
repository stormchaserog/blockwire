import { RouteSurface } from '$components/page/RouteSurface';
import { CreateProjectForm } from '$features/create-project';
import { useRoomNavigate } from '$hooks/useRoomNavigate';

/** BlockWire's own create flow — a Matrix Space plus a bound Project record,
 *  in one guided form. See src/app/features/create-project/CreateProject.tsx
 *  for why these are two sequential calls rather than one atomic operation. */
export function CreateProject() {
  const { navigateSpace } = useRoomNavigate();

  return (
    <RouteSurface
      title="New Project"
      subTitle="Set up a project workspace for your community."
      closeLabel="Close create project"
    >
      <CreateProjectForm onCreate={(project) => navigateSpace(project.space_room_id)} />
    </RouteSurface>
  );
}
