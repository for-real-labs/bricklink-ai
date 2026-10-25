import { exportLDraw, type Project } from "../domain/model";
import { BUILDER_ORIGIN, encodeTransfer, sendModel } from "./transfer";
export function transferToBrickBuilder(
  project: Project,
  action: "edit" | "order",
): Promise<void> {
  if (!project.bricks.length)
    return Promise.reject(new Error("Add or import a model first."));
  const model = { name: project.name, content: exportLDraw(project) };
  const destination = BUILDER_ORIGIN + (action === "order" ? "/order" : "/");
  if (window.brickbuilderStudioDesktop) {
    return window.brickbuilderStudioDesktop.openBrickBuilder(
      `${destination}#model=${encodeTransfer(model)}`,
    );
  }
  return sendModel(destination, model);
}
export function nativeStudioLink(project: Project): string {
  return `brickbuilder-studio://open-in-bricklink#model=${encodeTransfer({ name: project.name, content: exportLDraw(project) })}`;
}
