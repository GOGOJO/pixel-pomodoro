import type { SceneId } from "../store/settings";
import { bedroom } from "./bedroom";
import { cabin } from "./cabin";
import { cafe } from "./cafe";
import { city } from "./city";
import type { SceneDef } from "./pixel";

export const SCENES: Record<SceneId, SceneDef> = { bedroom, cabin, cafe, city };
export const SCENE_ORDER: SceneId[] = ["bedroom", "cabin", "cafe", "city"];
