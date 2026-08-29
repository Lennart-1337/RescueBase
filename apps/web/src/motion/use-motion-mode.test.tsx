import { render, screen } from "@testing-library/react";
import { AnimatedRouteView, AnimatedStateSection } from "./animated-containers";
import { prefersReducedMotion } from "./use-motion-mode";
import { setReducedMotionForTests } from "../test/setup";

describe("motion accessibility", () => {
  afterEach(() => {
    setReducedMotionForTests(false);
  });

  it("detects the reduced-motion media query", () => {
    setReducedMotionForTests(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("marks animated wrappers as reduced when motion should be minimized", () => {
    setReducedMotionForTests(true);

    render(
      <AnimatedStateSection className="panel state-panel">
        <h1>Reduziert</h1>
      </AnimatedStateSection>
    );

    expect(screen.getByText("Reduziert").closest("[data-motion-mode]")).toHaveAttribute("data-motion-mode", "reduced");
  });

  it("marks route wrappers so the application shell can space page sections", () => {
    render(<AnimatedRouteView routeKey="kits"><h1>Rucksäcke</h1></AnimatedRouteView>);

    expect(screen.getByText("Rucksäcke").closest(".animated-route-view")).toBeInTheDocument();
  });
});
