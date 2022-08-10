import { Objective } from "@seasketch/geoprocessing/client-core";
import { ObjectiveNew } from "./types";

/** find and return objectives from passed objectives, otherwise reads from disk */
export const getObjectiveById = (
  objectiveId: string,
  objectives: ObjectiveNew[]
): ObjectiveNew => {
  const obj = objectives.find((obj) => obj.objectiveId === objectiveId);
  if (!obj) {
    throw new Error(`Objective not found - ${objectiveId}`);
  } else {
    return obj;
  }
};

/** Given new objective object, transforms and returns a legacy objective object */
export const newObjectiveToLegacy = (objective: ObjectiveNew): Objective => {
  return {
    ...objective,
    id: objective.objectiveId,
  };
};
