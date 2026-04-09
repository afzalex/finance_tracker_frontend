import { apiErrorMessage } from './financeApi'
import { classificationsApi, parsersApi, exclusionRulesApi } from './apiConfig'

function handleError(err) {
  // Keep error formatting consistent with other service helpers.
  return apiErrorMessage(err)
}

export async function listClassifications() {
  const res = await classificationsApi.listClassificationsApiV1ClassificationsGet()
  return res.data
}

export async function createClassification(payload) {
  try {
    const res =
      await classificationsApi.createClassificationApiV1ClassificationsPost(
        payload,
      )
    return res.data
  } catch (err) {
    throw new Error(handleError(err))
  }
}

export async function patchClassification(classificationId, payload) {
  try {
    const res =
      await classificationsApi.patchClassificationApiV1ClassificationsClassificationIdPatch(
        classificationId,
        payload,
      )
    return res.data
  } catch (err) {
    throw new Error(handleError(err))
  }
}

export async function deactivateClassification(classificationId) {
  try {
    const res =
      await classificationsApi.deleteClassificationApiV1ClassificationsClassificationIdDelete(
        classificationId,
      )
    return res.data
  } catch (err) {
    throw new Error(handleError(err))
  }
}

export async function listParsers() {
  const res = await parsersApi.listParsersApiV1ParsersGet()
  return res.data
}

export async function createParser(payload) {
  try {
    const res = await parsersApi.createParserApiV1ParsersPost(payload)
    return res.data
  } catch (err) {
    throw new Error(handleError(err))
  }
}

export async function patchParser(parserId, payload) {
  try {
    const res =
      await parsersApi.patchParserApiV1ParsersParserIdPatch(parserId, payload)
    return res.data
  } catch (err) {
    throw new Error(handleError(err))
  }
}

export async function deactivateParser(parserId) {
  try {
    const res = await parsersApi.deleteParserApiV1ParsersParserIdDelete(parserId)
    return res.data
  } catch (err) {
    throw new Error(handleError(err))
  }
}

export async function listExclusionRules() {
  const res = await exclusionRulesApi.listExclusionRulesApiV1ExclusionRulesGet()
  return res.data
}

export async function createExclusionRule(payload) {
  try {
    const res = await exclusionRulesApi.createExclusionRuleApiV1ExclusionRulesPost(payload)
    return res.data
  } catch (err) {
    throw new Error(handleError(err))
  }
}

export async function patchExclusionRule(ruleId, payload) {
  try {
    const res = await exclusionRulesApi.updateExclusionRuleApiV1ExclusionRulesRuleIdPatch(ruleId, payload)
    return res.data
  } catch (err) {
    throw new Error(handleError(err))
  }
}

export async function deactivateExclusionRule(ruleId) {
  try {
    // Standardizing on 'deactivate' naming convention matching the DB behavior
    const res = await exclusionRulesApi.deleteExclusionRuleApiV1ExclusionRulesRuleIdDelete(ruleId)
    return res.data
  } catch (err) {
    throw new Error(handleError(err))
  }
}

