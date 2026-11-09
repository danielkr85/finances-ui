/** Categories are private to each user; names are unique per user (case-insensitive). */
export interface Category {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRequest {
  name: string;
}
