import { Router } from "express";
import {
  getCountriesList,
  getCountryStatesList,
  getStateCitiesList,
  getCitiesList,
  getCityDetail,
  createNewCity,
  editCity,
  removeCity,
} from "../controllers/locationController";
import { authenticate } from "../middlewares/authentication";

const router = Router();
router.use(authenticate);

router.get("/countries", getCountriesList);
router.get("/countries/:countryId/states", getCountryStatesList);
router.get("/states/:stateId/cities", getStateCitiesList);

router.get("/cities", getCitiesList);
router.get("/cities/:id", getCityDetail);
router.post("/cities", createNewCity);
router.put("/cities/:id", editCity);
router.delete("/cities/:id", removeCity);

export default router;
