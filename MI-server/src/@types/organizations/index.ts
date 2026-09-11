// src/@types/organizations/index.ts

export interface IOrganization {
  id:          string
  name:        string
  description: string | null
  status:      string
  createdById: string
  createdAt:   Date
  updatedAt:   Date
}

export interface IOrganizationListItem {
  id:          string
  name:        string
  description: string | null
  status:      string
  myRole:      string
  memberCount: number
  createdAt:   Date
}

/** Item da listagem administrativa de organizações (sem vínculo com o usuário). */
export interface IOrganizationAdminItem {
  id:          string
  name:        string
  description: string | null
  status:      string
  createdById: string
  memberCount: number
  createdAt:   Date
}

/** Resultado paginado da listagem administrativa de organizações. */
export interface IOrganizationAdminListResult {
  organizations: IOrganizationAdminItem[]
  total:         number
  page:          number
  perPage:       number
}

export interface IOrganizationMember {
  id:             string
  organizationId: string
  userId:         string
  role:           string
  joinedAt:       Date
  user: {
    name:  string
    email: string
  }
}

export interface IOrganizationInvite {
  id:             string
  organizationId: string
  invitedUserId:  string
  invitedById:    string
  status:         string
  createdAt:      Date
  respondedAt:    Date | null
  organization: {
    name: string
  }
  invitedBy: {
    name: string
  }
}
