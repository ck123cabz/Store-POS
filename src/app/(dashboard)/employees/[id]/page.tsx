import { redirect } from "next/navigation"

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = await params
  redirect(`/employees?tab=team&id=${id}`)
}
