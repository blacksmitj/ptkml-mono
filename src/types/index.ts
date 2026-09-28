/**
 * ENUMS
 */

export enum GlobalRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  USER = 'USER',
  WORKSPACE_SUPERVISOR = 'WORKSPACE_SUPERVISOR',
}

export enum WorkspaceRole {
  UNIVERSITY_ADMIN = 'UNIVERSITY_ADMIN',
  MENTOR = 'MENTOR',
  UNIVERSITY_SUPERVISOR = 'UNIVERSITY_SUPERVISOR',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum MarketingArea {
  VILLAGE = 'VILLAGE',
  DISTRICT = 'DISTRICT',
  CITY = 'CITY',
  PROVINCE = 'PROVINCE',
  INTERNATIONAL = 'INTERNATIONAL',
}

export enum BookkeepingType {
  NONE = 'NONE',
  MANUAL = 'MANUAL',
  EXCEL = 'EXCEL',
  APPLICATION = 'APPLICATION',
}

export enum BpjsStatus {
  REGISTERED = 'REGISTERED',
  NOT_REGISTERED = 'NOT_REGISTERED',
}

export enum BpjsType {
  WAGE_EARNER = 'WAGE_EARNER',
  NON_WAGE_EARNER = 'NON_WAGE_EARNER',
}

export enum NikStatus {
  IDLE = 'IDLE',
  CHECKING = 'CHECKING',
  VALID = 'VALID',
  DUPLICATE = 'DUPLICATE',
}

export enum CommunicationStatus {
  RESPONDED = 'RESPONDED',
  NO_RESPONSE = 'NO_RESPONSE',
}

export enum FundDisbursement {
  DISBURSED = 'DISBURSED',
  NOT_DISBURSED = 'NOT_DISBURSED',
}

export enum Willingness {
  WILLING = 'WILLING',
  NOT_WILLING = 'NOT_WILLING',
}

export enum PresenceStatus {
  FOUND = 'FOUND',
  NOT_FOUND = 'NOT_FOUND',
}

export enum ApplicantStatus {
  ACTIVE = 'ACTIVE',
  DROPPED = 'DROPPED',
  PENDING = 'PENDING',
}

export enum MeetingType {
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP = 'GROUP',
}

export enum DeliveryMethod {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export enum VisitType {
  LOCAL = 'LOCAL',
  OUT_OF_TOWN = 'OUT_OF_TOWN',
  NONE = 'NONE',
}

export enum VerificationStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ConflictSource {
  APPLICANT = 'APPLICANT',
  MENTOR = 'MENTOR',
  BOTH = 'BOTH',
}

export enum FileCategory {
  LOGBOOK_DOCUMENTATION = 'LOGBOOK_DOCUMENTATION',
  EXPENSE_PROOF = 'EXPENSE_PROOF',
  EMPLOYEE_KTP = 'EMPLOYEE_KTP',
  EMPLOYEE_SALARY_SLIP = 'EMPLOYEE_SALARY_SLIP',
  EMPLOYEE_BPJS_CARD = 'EMPLOYEE_BPJS_CARD',
  OUTPUT_CASHFLOW_PROOF = 'OUTPUT_CASHFLOW_PROOF',
  OUTPUT_INCOME_PROOF = 'OUTPUT_INCOME_PROOF',
  APPLICANT_BMC = 'APPLICANT_BMC',
  APPLICANT_ACTION_PLAN = 'APPLICANT_ACTION_PLAN',
}

export enum FollowUpStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum InterventionPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * MODELS
 */

export interface Province {
  id: string;
  name: string;
  cities?: City[];
  addresses?: Address[];
  createdAt: Date;
}

export interface City {
  id: string;
  provinceId: string;
  province?: Province;
  name: string;
  districts?: District[];
  addresses?: Address[];
  createdAt: Date;
}

export interface District {
  id: string;
  cityId: string;
  city?: City;
  name: string;
  subdistricts?: Subdistrict[];
  addresses?: Address[];
  createdAt: Date;
}

export interface Subdistrict {
  id: string;
  districtId: string;
  district?: District;
  name: string;
  addresses?: Address[];
  createdAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  year: number;
  code?: string | null;
  isActive: boolean;
  isInputFrozen?: boolean;
  members?: WorkspaceMember[];
  applicants?: Applicant[];
  logbooks?: Logbook[];
  outputReports?: OutputReport[];
  universities?: WorkspaceUniversity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceUniversity {
  id: string;
  workspaceId: string;
  workspace?: Workspace;
  universityId: string;
  university?: University;
  createdAt: Date;
}

export interface University {
  id: string;
  name: string;
  logo?: string | null;
  isActive: boolean;
  members?: WorkspaceMember[];
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    applicants: number;
    mentors: number;
    admins: number;
  };
}

export interface Profile {
  id: string;
  name: string;
  nik: string;
  birthPlace: string;
  birthDate: Date;
  gender: Gender;
  photo?: string | null;
  email: string;
  whatsapp: string;
  hasDisability: boolean;
  disabilityType?: string | null;
  addresses?: Address[];
  user?: User | null;
  applicant?: Applicant | null;
  employees?: Employee[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  id: string;
  label: string;
  address: string;
  provinceId: string;
  province?: Province;
  provinceName: string;
  cityId: string;
  city?: City;
  cityName: string;
  districtId: string;
  district?: District;
  districtName: string;
  subdistrictId: string;
  subdistrict?: Subdistrict;
  subdistrictName: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  profileId: string;
  profile?: Profile;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  profileId: string;
  profile?: Profile;
  username?: string;
  globalRole: GlobalRole;
  workspaceMemberships?: WorkspaceMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  workspace?: Workspace;
  userId: string;
  user?: User;
  universityId?: string | null;
  university?: University | null;
  role: WorkspaceRole;
  applicants?: Applicant[];
  createdLogbooks?: Logbook[];
  verifiedLogbooks?: Logbook[];
  verifiedOutputs?: OutputReport[];
  verificationStatus: VerificationStatus;
  _count?: {
    applicants?: number;
    createdLogbooks?: number;
    verifiedLogbooks?: number;
    verifiedOutputs?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Applicant {
  id: string;
  idTkm: string;
  workspaceId: string;
  workspace?: Workspace;
  universityId?: string | null;
  university?: University | null;
  mentorId?: string | null;
  mentor?: WorkspaceMember | null;
  profileId: string;
  profile?: Profile;
  communicationStatus: CommunicationStatus;
  fundDisbursement: FundDisbursement;
  willingness: Willingness;
  reasonNotWilling?: string | null;
  presenceStatus: PresenceStatus;
  status: ApplicantStatus;
  reasonDropped?: string | null;
  outputReports?: OutputReport[];
  logbooks?: LogbookApplicant[];
  files?: File[];
  businessProfile?: BusinessProfile | null;
  followUpRecommendation?: FollowUpRecommendation | null;
  isEligibleForFollowUp?: boolean;
  followUpStatus?: string;
  mentoringCount?: number;
  offlineIndividualVisitCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpFindingItem {
  id: string;
  type: 'POSITIVE' | 'OBSTACLE' | 'WARNING';
  text: string;
  source?: 'OUTPUT_REPORT' | 'SMART_METRIC' | 'MANUAL';
}

export interface FollowUpRecommendationItem {
  id: string;
  interventionType: string;
  priority: InterventionPriority | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface FollowUpRecommendation {
  id: string;
  applicantId: string;
  applicant?: Applicant;
  mentorId: string;
  mentor?: WorkspaceMember;
  workspaceId: string;
  workspace?: Workspace;
  findings?: FollowUpFindingItem[] | any;
  recommendations?: FollowUpRecommendationItem[] | any;
  mentorNote?: string | null;
  status: FollowUpStatus;
  reviewNote?: string | null;
  reviewedAt?: string | Date | null;
  reviewedById?: string | null;
  reviewedBy?: WorkspaceMember | null;
  submittedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface BusinessProfile {
  id: string;
  applicantId: string;
  applicant?: Applicant;
  businessName: string;
  businessSector: string;
  businessType: string;
  description?: string | null;
  mainProduct?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationHistoryItem {
  id: string;
  role: "UNIVERSITY_ADMIN" | "MENTOR" | "SUPER_ADMIN" | string;
  action: "REJECTED" | "REBUTTAL" | string;
  authorName: string;
  authorRole?: string;
  note: string;
  createdAt: string;
}

export interface Logbook {
  id: string;
  workspaceId: string;
  workspace?: Workspace;
  createdById: string;
  createdBy?: WorkspaceMember;
  logbookDate: Date;
  startTime: Date;
  endTime: Date;
  deliveryMethod: DeliveryMethod;
  meetingType: MeetingType;
  visitType: VisitType;
  mentoringMaterial: string;
  activitySummary: string;
  obstacle: string;
  solutions: string;
  totalExpense?: number | null;
  reasonNoExpense?: string | null;
  verificationStatus: VerificationStatus;
  verificationNote?: string | null;
  rebuttalNote?: string | null;
  verificationHistory?: VerificationHistoryItem[] | null;
  verifiedAt?: Date | null;
  verifiedById?: string | null;
  verifiedBy?: WorkspaceMember | null;
  applicants?: LogbookApplicant[];
  files?: File[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LogbookApplicant {
  logbookId: string;
  applicantId: string;
  logbook?: Logbook;
  applicant?: Applicant;
}

export interface OutputReport {
  id: string;
  workspaceId: string;
  workspace?: Workspace;
  applicantId: string;
  applicant?: Applicant;
  monthReport: number;
  productionCapacity: number;
  productionCapacityUnit: string;
  salesVolume: number;
  salesVolumeUnit: string;
  marketingArea: MarketingArea;
  revenue: number;
  bookkeepingCashflow: BookkeepingType;
  bookkeepingIncomeStatement: BookkeepingType;
  businessCondition: string;
  obstacle?: string | null;
  hasRemindLpj: boolean;
  verificationStatus: VerificationStatus;
  verificationNote?: string | null;
  rebuttalNote?: string | null;
  verificationHistory?: VerificationHistoryItem[] | null;
  verifiedAt?: Date | null;
  verifiedById?: string | null;
  verifiedBy?: WorkspaceMember | null;
  employees?: Employee[];
  files?: File[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  outputId: string;
  output?: OutputReport;
  profileId?: string | null;
  profile?: Profile | null;
  name: string;
  role: string;
  gender: Gender;
  hasDisability: boolean;
  disabilityType?: string | null;
  employmentStatus: string;
  nik: string;
  bpjsStatus: BpjsStatus;
  bpjsType?: BpjsType | null;
  bpjsNumber?: string | null;
  nikStatus: NikStatus;
  hasIdentityConflict: boolean;
  conflictSource?: ConflictSource | null;
  files?: File[];
  createdAt: Date;
  updatedAt: Date;
}

export interface File {
  id: string;
  url: string;
  objectKey?: string;
  bucket?: string | null;
  mimeType?: string | null;
  category: FileCategory;
  logbookId?: string | null;
  logbook?: Logbook | null;
  employeeId?: string | null;
  employee?: Employee | null;
  outputId?: string | null;
  output?: OutputReport | null;
  applicantId?: string | null;
  applicant?: Applicant | null;
  ocrResult?: OcrResult | null;
  createdAt: Date;
}

export enum OcrStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum OcrDocumentType {
  KTP = 'KTP',
  BPJS = 'BPJS',
  SALARY_SLIP = 'SALARY_SLIP',
  REPORT = 'REPORT',
  RECEIPT = 'RECEIPT',
  CASHFLOW = 'CASHFLOW',
  OTHER = 'OTHER',
}

export interface OcrResult {
  id: string;
  fileId: string;
  file?: File;
  status: OcrStatus;
  documentType: OcrDocumentType;
  rawText?: string | null;
  parsedData?: any;
  confidence?: number | null;
  processingTime?: number | null;
  engine?: string | null;
  errorMessage?: string | null;
  processedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  validations?: OcrValidation[];
}

export interface OcrValidation {
  id: string;
  ocrResultId: string;
  fieldName: string;
  manualValue?: string | null;
  extractedValue?: string | null;
  isMatch: boolean;
  confidence?: number | null;
  createdAt: string | Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
