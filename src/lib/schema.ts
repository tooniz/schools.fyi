import { z } from "zod";

export const subjects = ["language", "math"] as const;
export const SubjectSchema = z.enum(subjects);
export type Subject = z.infer<typeof SubjectSchema>;
export const gradeLevels = ["JK", "SK", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
export const GradeLevelSchema = z.enum(gradeLevels);
export type GradeLevel = z.infer<typeof GradeLevelSchema>;

export const SourceSchema = z.object({id:z.string().min(1),canonicalUrl:z.url(),publisher:z.string().min(1),accessDate:z.iso.date(),pageTitle:z.string().min(1),documentReference:z.string().optional(),pageReference:z.string().optional(),kind:z.enum(["official-requirement","school-published","community-submission"])});
export type Source = z.infer<typeof SourceSchema>;
export const SchoolSchema = z.object({id:z.string().regex(/^[a-z0-9-]+$/),name:z.string().min(1),shortName:z.string().min(1),type:z.enum(["public-curriculum","supplemental-program","independent-school"]),url:z.url(),location:z.string().min(1),supportedGrades:z.array(GradeLevelSchema),methodology:z.string().min(1),sourceIds:z.array(z.string()).min(1),reviewed:z.boolean()});
export type School = z.infer<typeof SchoolSchema>;
export const CurriculumExpectationSchema = z.object({id:z.string().min(1),schoolId:z.string(),subject:SubjectSchema,grade:GradeLevelSchema,strand:z.string().min(1),sourceText:z.string().min(1),comparisonLabel:z.string().min(1),expectation:z.string().min(1),sequence:z.number().int().nonnegative(),sourceId:z.string(),sourceLocator:z.string().min(1),verificationStatus:z.enum(["verified","not-publicly-documented","pending-review"]),lastReviewed:z.iso.date(),qualificationNotes:z.string().optional()});
export type CurriculumExpectation = z.infer<typeof CurriculumExpectationSchema>;
