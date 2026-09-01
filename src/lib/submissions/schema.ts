import { z } from "zod";import { GradeLevelSchema,SubjectSchema } from "../schema";
export const SUBMISSION_SCHEMA_VERSION="1.0";
export const SubmissionSchema=z.object({schemaVersion:z.literal(SUBMISSION_SCHEMA_VERSION),sourceUrl:z.url(),provider:z.string().min(2),grade:GradeLevelSchema,subject:SubjectSchema,proposedChange:z.string().min(20),contributorNotes:z.string().min(10),conflictOfInterest:z.string().min(2)});
export type Submission=z.infer<typeof SubmissionSchema>;
